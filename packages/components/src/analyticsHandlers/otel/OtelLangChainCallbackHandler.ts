import { Context, ROOT_CONTEXT, Span, SpanKind, SpanStatusCode, Tracer, trace } from '@opentelemetry/api'
import { BaseCallbackHandler } from '@langchain/core/callbacks/base'
import { Serialized } from '@langchain/core/load/serializable'
import { LLMResult } from '@langchain/core/outputs'
import { AgentAction, AgentFinish } from '@langchain/core/agents'
import { ChainValues } from '@langchain/core/utils/types'
import { DocumentInterface } from '@langchain/core/documents'
import { ICommonObject } from '../../Interface'

export const RESERVED_ATTRIBUTE_KEYS = new Set([
    'openinference.span.kind',
    'session.id',
    'user.id',
    'flowise.chatflow_id',
    'request.type',
    'metadata',
    'service.name',
    'service.version',
    'deployment.environment',
    'input.value',
    'input.mime_type',
    'output.value',
    'output.mime_type',
    'exception.type',
    'exception.message'
])

export function isReservedAttributeKey(key: string): boolean {
    return RESERVED_ATTRIBUTE_KEYS.has(key)
}

interface OtelHandlerOptions {
    tracer: Tracer
    chatflowId: string
    chatId?: string
    spanAttributes?: Record<string, string>
    overrideConfig?: ICommonObject
}

export class OtelLangChainCallbackHandler extends BaseCallbackHandler {
    name = 'otel_langchain_handler'

    static readonly MAX_TRACKED_RUNS = 10_000
    static readonly STALE_RUN_TTL_MS = 10 * 60 * 1000 // 10 minutes

    private tracer: Tracer
    private chatflowId: string
    private chatId?: string
    private spanAttributes?: Record<string, string>
    private overrideConfig?: ICommonObject

    private spanMap: Map<string, Span> = new Map()
    private contextMap: Map<string, Context> = new Map()
    private startTimeMap: Map<string, number> = new Map()
    private insertionTimeMap: Map<string, number> = new Map()
    private rootRunId?: string

    constructor(options: OtelHandlerOptions) {
        super()
        this.tracer = options.tracer
        this.chatflowId = options.chatflowId
        this.chatId = options.chatId
        this.spanAttributes = options.spanAttributes
        this.overrideConfig = options.overrideConfig
    }

    private evictStaleEntries(): void {
        const now = Date.now()
        const ttl = OtelLangChainCallbackHandler.STALE_RUN_TTL_MS

        for (const [runId, insertedAt] of this.insertionTimeMap) {
            if (now - insertedAt > ttl) {
                const orphanedSpan = this.spanMap.get(runId)
                if (orphanedSpan) {
                    try {
                        orphanedSpan.setStatus({ code: SpanStatusCode.ERROR, message: 'Span evicted: exceeded TTL without completion' })
                        orphanedSpan.end()
                    } catch {
                        // already ended or invalid — safe to ignore
                    }
                }
                this.spanMap.delete(runId)
                this.contextMap.delete(runId)
                this.startTimeMap.delete(runId)
                this.insertionTimeMap.delete(runId)
            }
        }
    }

    private startSpan(name: string, runId: string, parentRunId?: string, attributes?: Record<string, any>, kind?: SpanKind): Span {
        if (this.spanMap.size >= OtelLangChainCallbackHandler.MAX_TRACKED_RUNS) {
            this.evictStaleEntries()
        }

        if (this.spanMap.size >= OtelLangChainCallbackHandler.MAX_TRACKED_RUNS) {
            console.warn(
                `[OTEL] Span map still at capacity (${this.spanMap.size}) after eviction — possible leak in chatflow ${this.chatflowId}`
            )
        }

        let parentCtx: Context
        if (parentRunId && this.contextMap.has(parentRunId)) {
            parentCtx = this.contextMap.get(parentRunId)!
        } else {
            parentCtx = ROOT_CONTEXT
        }

        const span = this.tracer.startSpan(name, { kind, attributes }, parentCtx)
        const spanCtx = trace.setSpan(parentCtx, span)

        if (!parentRunId || !this.contextMap.has(parentRunId)) {
            this.rootRunId = this.rootRunId ?? runId
            this.applyRootAttributes(span)
        }

        this.spanMap.set(runId, span)
        this.contextMap.set(runId, spanCtx)
        this.insertionTimeMap.set(runId, Date.now())

        return span
    }

    private applyRootAttributes(span: Span): void {
        span.setAttribute('flowise.chatflow_id', this.chatflowId)
        span.setAttribute('metadata', JSON.stringify({ 'flowise.chatflow_id': this.chatflowId }))
        span.setAttribute('request.type', 'chatflow')

        if (this.chatId) {
            span.setAttribute('session.id', this.chatId)
        }

        if (this.spanAttributes) {
            for (const [key, value] of Object.entries(this.spanAttributes)) {
                if (!isReservedAttributeKey(key)) {
                    span.setAttribute(key, value)
                }
            }
        }

        const otelOverrides = this.overrideConfig?.analytics?.openTelemetry
        if (otelOverrides) {
            if (otelOverrides.userId) {
                span.setAttribute('user.id', otelOverrides.userId)
            }
            if (otelOverrides.sessionId) {
                span.setAttribute('session.id', otelOverrides.sessionId)
            }
            if (otelOverrides.customAttributes && typeof otelOverrides.customAttributes === 'object') {
                for (const [key, value] of Object.entries(otelOverrides.customAttributes)) {
                    if (
                        (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') &&
                        !isReservedAttributeKey(key)
                    ) {
                        span.setAttribute(key, value)
                    }
                }
            }
        }
    }

    private endSpan(runId: string): void {
        const span = this.spanMap.get(runId)
        if (span) {
            span.setStatus({ code: SpanStatusCode.OK })
            span.end()
            this.spanMap.delete(runId)
            this.contextMap.delete(runId)
            this.insertionTimeMap.delete(runId)
        }
    }

    private endSpanWithError(runId: string, error: Error | string): void {
        const span = this.spanMap.get(runId)
        if (span) {
            const err = typeof error === 'string' ? new Error(error) : error
            span.setAttribute('exception.type', err.name ?? 'Error')
            span.setAttribute('exception.message', err.message)
            span.recordException(err)
            span.setStatus({ code: SpanStatusCode.ERROR, message: err.message })
            span.end()
            this.spanMap.delete(runId)
            this.contextMap.delete(runId)
            this.insertionTimeMap.delete(runId)
        }
    }

    private extractChainType(serialized?: Serialized): string {
        if (!serialized) return 'unknown'
        const id = (serialized as any).id
        if (Array.isArray(id) && id.length > 0) {
            return id[id.length - 1] ?? 'unknown'
        }
        return (serialized as any).name ?? 'unknown'
    }

    async handleChainStart(chain: Serialized, inputs: ChainValues, runId: string, parentRunId?: string): Promise<void> {
        const chainType = this.extractChainType(chain)
        const isRoot = !parentRunId || !this.contextMap.has(parentRunId)
        this.startSpan(
            chainType,
            runId,
            parentRunId,
            {
                'openinference.span.kind': 'CHAIN',
                'input.value': JSON.stringify(inputs),
                'input.mime_type': 'application/json'
            },
            isRoot ? SpanKind.SERVER : SpanKind.INTERNAL
        )
    }

    async handleChainEnd(outputs: ChainValues, runId: string): Promise<void> {
        const span = this.spanMap.get(runId)
        if (span) {
            span.setAttribute('output.value', JSON.stringify(outputs))
            span.setAttribute('output.mime_type', 'application/json')
        }
        this.endSpan(runId)
    }

    async handleChainError(error: Error, runId: string): Promise<void> {
        this.endSpanWithError(runId, error)
    }

    async handleLLMStart(
        llm: Serialized,
        prompts: string[],
        runId: string,
        parentRunId?: string,
        extraParams?: Record<string, unknown>
    ): Promise<void> {
        const providerName = this.extractChainType(llm)
        const model = (extraParams?.invocation_params as any)?.model ?? (extraParams?.invocation_params as any)?.model_name ?? undefined
        const maxTokens = (extraParams?.invocation_params as any)?.max_tokens ?? undefined
        const temperature = (extraParams?.invocation_params as any)?.temperature ?? undefined

        const spanName = model ?? providerName
        const attributes: Record<string, any> = {
            'openinference.span.kind': 'LLM',
            'llm.system': providerName,
            'llm.provider': providerName,
            'input.value': JSON.stringify(prompts),
            'input.mime_type': 'application/json'
        }
        if (model !== undefined) {
            attributes['llm.model_name'] = model
            attributes['llm.model'] = model
        }
        if (temperature !== undefined) {
            attributes['llm.temperature'] = temperature
        }

        const invocationParams: Record<string, any> = {}
        if (maxTokens !== undefined) invocationParams['max_tokens'] = maxTokens
        if (temperature !== undefined) invocationParams['temperature'] = temperature
        if (Object.keys(invocationParams).length > 0) {
            attributes['llm.invocation_parameters'] = JSON.stringify(invocationParams)
        }

        this.startTimeMap.set(runId, Date.now())
        this.startSpan(spanName, runId, parentRunId, attributes, SpanKind.CLIENT)
    }

    async handleLLMEnd(output: LLMResult, runId: string): Promise<void> {
        const span = this.spanMap.get(runId)
        if (span) {
            const usage = output.llmOutput?.tokenUsage ?? output.llmOutput?.usage ?? {}
            const inputTokens = usage.promptTokens ?? usage.prompt_tokens
            const outputTokens = usage.completionTokens ?? usage.completion_tokens
            if (inputTokens !== undefined) {
                span.setAttribute('llm.token_count.prompt', inputTokens)
                span.setAttribute('llm.prompt_tokens', inputTokens)
            }
            if (outputTokens !== undefined) {
                span.setAttribute('llm.token_count.completion', outputTokens)
                span.setAttribute('llm.completion_tokens', outputTokens)
            }
            const totalTokens = usage.totalTokens ?? usage.total_tokens ?? ((inputTokens ?? 0) + (outputTokens ?? 0) || undefined)
            if (totalTokens !== undefined) {
                span.setAttribute('llm.token_count.total', totalTokens)
                span.setAttribute('llm.total_tokens', totalTokens)
            }

            const responseModel = output.llmOutput?.model ?? output.llmOutput?.model_name
            if (responseModel) {
                span.setAttribute('llm.model_name', responseModel)
                span.setAttribute('llm.model', responseModel)
            }

            const startTime = this.startTimeMap.get(runId)
            if (startTime !== undefined) {
                span.setAttribute('llm.latency_ms', Date.now() - startTime)
                this.startTimeMap.delete(runId)
            }

            const outputMessages = output.generations
                ?.flat()
                ?.map((g: any) => g.text ?? g.message?.content)
                ?.filter(Boolean)
            if (outputMessages && outputMessages.length > 0) {
                span.setAttribute('output.value', JSON.stringify(outputMessages))
                span.setAttribute('output.mime_type', 'application/json')
            }
        }
        this.endSpan(runId)
    }

    async handleLLMError(error: Error, runId: string): Promise<void> {
        const span = this.spanMap.get(runId)
        const startTime = this.startTimeMap.get(runId)
        if (span && startTime !== undefined) {
            span.setAttribute('llm.latency_ms', Date.now() - startTime)
            this.startTimeMap.delete(runId)
        }
        this.endSpanWithError(runId, error)
    }

    async handleToolStart(tool: Serialized, input: string, runId: string, parentRunId?: string): Promise<void> {
        const toolName = (tool as any).name ?? this.extractChainType(tool)
        this.startTimeMap.set(runId, Date.now())
        this.startSpan(
            toolName,
            runId,
            parentRunId,
            {
                'openinference.span.kind': 'TOOL',
                'tool.name': toolName,
                'tool.type': 'unknown',
                'tool.input': input,
                'input.value': input,
                'input.mime_type': 'text/plain'
            },
            SpanKind.CLIENT
        )
    }

    async handleToolEnd(output: string, runId: string): Promise<void> {
        const span = this.spanMap.get(runId)
        if (span) {
            span.setAttribute('output.value', output)
            span.setAttribute('output.mime_type', 'text/plain')
            span.setAttribute('tool.output', output)
            const startTime = this.startTimeMap.get(runId)
            if (startTime !== undefined) {
                span.setAttribute('tool.latency_ms', Date.now() - startTime)
                this.startTimeMap.delete(runId)
            }
        }
        this.endSpan(runId)
    }

    async handleToolError(error: Error, runId: string): Promise<void> {
        const span = this.spanMap.get(runId)
        const startTime = this.startTimeMap.get(runId)
        if (span && startTime !== undefined) {
            span.setAttribute('tool.latency_ms', Date.now() - startTime)
            this.startTimeMap.delete(runId)
        }
        this.endSpanWithError(runId, error)
    }

    async handleRetrieverStart(retriever: Serialized, query: string, runId: string, parentRunId?: string): Promise<void> {
        const retrieverName = (retriever as any).name ?? this.extractChainType(retriever)
        this.startTimeMap.set(runId, Date.now())
        this.startSpan(
            `retrieval.${retrieverName}`,
            runId,
            parentRunId,
            {
                'openinference.span.kind': 'RETRIEVER',
                'retrieval.source': retrieverName,
                'retrieval.query': query,
                'input.value': query,
                'input.mime_type': 'text/plain'
            },
            SpanKind.CLIENT
        )
    }

    async handleRetrieverEnd(documents: DocumentInterface[], runId: string): Promise<void> {
        const span = this.spanMap.get(runId)
        if (span) {
            span.setAttribute('retrieval.num_results', documents.length)

            const docSummaries = documents.map((doc, idx) => ({
                index: idx,
                id: doc.id,
                pageContentLength: doc.pageContent?.length ?? 0,
                metadata: doc.metadata
            }))
            span.setAttribute('output.value', JSON.stringify(docSummaries))
            span.setAttribute('output.mime_type', 'application/json')
            span.setAttribute('retrieval.documents', JSON.stringify(docSummaries))

            const startTime = this.startTimeMap.get(runId)
            if (startTime !== undefined) {
                span.setAttribute('retrieval.latency_ms', Date.now() - startTime)
                this.startTimeMap.delete(runId)
            }
        }
        this.endSpan(runId)
    }

    async handleRetrieverError(error: Error, runId: string): Promise<void> {
        const span = this.spanMap.get(runId)
        const startTime = this.startTimeMap.get(runId)
        if (span && startTime !== undefined) {
            span.setAttribute('retrieval.latency_ms', Date.now() - startTime)
            this.startTimeMap.delete(runId)
        }
        this.endSpanWithError(runId, error)
    }

    async handleAgentAction(action: AgentAction, runId: string): Promise<void> {
        const span = this.spanMap.get(runId) ?? this.spanMap.get(this.rootRunId ?? '')
        if (span) {
            span.addEvent('agent.action', {
                'tool.name': action.tool,
                'input.value': typeof action.toolInput === 'string' ? action.toolInput : JSON.stringify(action.toolInput),
                'agent.log': action.log
            })
        }
    }

    async handleAgentEnd(action: AgentFinish, runId: string): Promise<void> {
        const rootSpan = this.spanMap.get(this.rootRunId ?? '') ?? this.spanMap.get(runId)
        if (rootSpan) {
            rootSpan.addEvent('agent.finish', {
                'output.value': JSON.stringify(action.returnValues),
                'agent.log': action.log
            })
        }
    }

    async handleText(text: string, runId: string): Promise<void> {
        const span = this.spanMap.get(runId) ?? this.spanMap.get(this.rootRunId ?? '')
        if (span) {
            span.addEvent('text.token', {
                'text.content': text
            })
        }
    }
}
