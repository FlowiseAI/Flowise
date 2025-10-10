import { Logger } from 'winston'
import { v4 as uuidv4 } from 'uuid'
import { Client } from 'langsmith'
import CallbackHandler from 'langfuse-langchain'
import lunary from 'lunary'
import { RunTree, RunTreeConfig, Client as LangsmithClient } from 'langsmith'
import { Langfuse, LangfuseTraceClient, LangfuseSpanClient, LangfuseGenerationClient } from 'langfuse'
import { LangChainInstrumentation } from '@arizeai/openinference-instrumentation-langchain'
import { Metadata } from '@grpc/grpc-js'
import opentelemetry, { Span, SpanStatusCode } from '@opentelemetry/api'
import { OTLPTraceExporter as GrpcOTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-grpc'
import { OTLPTraceExporter as ProtoOTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-proto'
import { registerInstrumentations } from '@opentelemetry/instrumentation'
import { Resource } from '@opentelemetry/resources'
import { SimpleSpanProcessor, Tracer } from '@opentelemetry/sdk-trace-base'
import { NodeTracerProvider } from '@opentelemetry/sdk-trace-node'
import { ATTR_SERVICE_NAME, ATTR_SERVICE_VERSION } from '@opentelemetry/semantic-conventions'

import { BaseCallbackHandler, NewTokenIndices, HandleLLMNewTokenCallbackFields } from '@langchain/core/callbacks/base'
import * as CallbackManagerModule from '@langchain/core/callbacks/manager'
import { LangChainTracer, LangChainTracerFields } from '@langchain/core/tracers/tracer_langchain'
import { BaseTracer, Run } from '@langchain/core/tracers/base'
import { ChainValues } from '@langchain/core/utils/types'
import { AgentAction } from '@langchain/core/agents'
import { LunaryHandler } from '@langchain/community/callbacks/handlers/lunary'

import { getCredentialData, getCredentialParam, getEnvironmentVariable } from './utils'
import { ICommonObject, IDatabaseEntity, INodeData, IServerSideEventStreamer } from './Interface'
import { LangWatch, LangWatchSpan, LangWatchTrace, autoconvertTypedValues } from 'langwatch'
import { CredentialInfo, extractCredentialsAndModels } from './flowCredentialExtractor'
export interface TraceMetadata {
    stripeCustomerId: string
    subscriptionTier?: string
    userId: string
    organizationId: string
    aiCredentialsOwnership: string
    [key: string]: any
}
import { DataSource, In } from 'typeorm'
import { ChatGenerationChunk } from '@langchain/core/outputs'
import { AIMessageChunk, BaseMessageLike } from '@langchain/core/messages'
import { Serialized } from '@langchain/core/load/serializable'
import { JLINCTracer } from '@jlinc/langchain'

/**
 * Apply environment variable overrides for analytics providers
 * This allows global analytics configuration via env vars without UI setup
 *
 * @param analyticConfig - Existing analytics config (may be empty, string, or object)
 * @returns Analytics config with env overrides applied
 */
function applyEnvAnalyticsOverrides(analyticConfig?: string | object): any {
    let analytic: any = {}

    // Parse existing config if provided
    if (typeof analyticConfig === 'string') {
        try {
            analytic = JSON.parse(analyticConfig)
        } catch {
            analytic = {}
        }
    } else if (analyticConfig && typeof analyticConfig === 'object') {
        analytic = analyticConfig
    }

    // Langfuse env override - takes precedence over UI configuration
    if (process.env.LANGFUSE_SECRET_KEY) {
        analytic.langFuse = {
            status: true,
            release: process.env.LANGFUSE_RELEASE ?? process.env.GIT_COMMIT_HASH,
            secretKey: process.env.LANGFUSE_SECRET_KEY,
            publicKey: process.env.LANGFUSE_PUBLIC_KEY,
            endpoint: process.env.LANGFUSE_HOST ?? 'https://cloud.langfuse.com',
            sdkIntegration: 'Flowise'
        }
    }

    // Future providers can be added here:
    // if (process.env.LANGSMITH_API_KEY) { analytic.langSmith = { ... } }
    // if (process.env.ARIZE_API_KEY) { analytic.arize = { ... } }

    return analytic
}

/**
 * Check if analytics is enabled via UI config or environment variables
 *
 * @param analyticConfig - Analytics config from chatflow/agentflow
 * @returns True if any analytics provider is configured
 */
export function isAnalyticsEnabled(analyticConfig?: string | object): boolean {
    const analytic = applyEnvAnalyticsOverrides(analyticConfig)
    return Object.keys(analytic).length > 0
}

interface AgentRun extends Run {
    actions: AgentAction[]
}

interface ArizeTracerOptions {
    apiKey: string
    spaceId: string
    baseUrl: string
    projectName: string
    sdkIntegration?: string
    sessionId?: string
    enableCallback?: boolean
}

function getArizeTracer(options: ArizeTracerOptions): Tracer | undefined {
    const SEMRESATTRS_PROJECT_NAME = 'openinference.project.name'
    try {
        const metadata = new Metadata()
        metadata.set('api_key', options.apiKey)
        metadata.set('space_id', options.spaceId)
        const traceExporter = new GrpcOTLPTraceExporter({
            url: `${options.baseUrl}/v1`,
            metadata
        })
        const tracerProvider = new NodeTracerProvider({
            resource: new Resource({
                [ATTR_SERVICE_NAME]: options.projectName,
                [ATTR_SERVICE_VERSION]: '1.0.0',
                [SEMRESATTRS_PROJECT_NAME]: options.projectName,
                model_id: options.projectName
            })
        })
        tracerProvider.addSpanProcessor(new SimpleSpanProcessor(traceExporter))
        if (options.enableCallback) {
            registerInstrumentations({
                instrumentations: []
            })
            const lcInstrumentation = new LangChainInstrumentation()
            lcInstrumentation.manuallyInstrument(CallbackManagerModule)
            tracerProvider.register()
        }
        return tracerProvider.getTracer(`arize-tracer-${uuidv4().toString()}`)
    } catch (err) {
        if (process.env.DEBUG === 'true') console.error(`Error setting up Arize tracer: ${err.message}`)
        return undefined
    }
}

interface PhoenixTracerOptions {
    apiKey: string
    baseUrl: string
    projectName: string
    sdkIntegration?: string
    sessionId?: string
    enableCallback?: boolean
}

function getPhoenixTracer(options: PhoenixTracerOptions): Tracer | undefined {
    const SEMRESATTRS_PROJECT_NAME = 'openinference.project.name'
    try {
        const traceExporter = new ProtoOTLPTraceExporter({
            url: `${options.baseUrl}/v1/traces`,
            headers: {
                api_key: options.apiKey
            }
        })
        const tracerProvider = new NodeTracerProvider({
            resource: new Resource({
                [ATTR_SERVICE_NAME]: options.projectName,
                [ATTR_SERVICE_VERSION]: '1.0.0',
                [SEMRESATTRS_PROJECT_NAME]: options.projectName
            })
        })
        tracerProvider.addSpanProcessor(new SimpleSpanProcessor(traceExporter))
        if (options.enableCallback) {
            registerInstrumentations({
                instrumentations: []
            })
            const lcInstrumentation = new LangChainInstrumentation()
            lcInstrumentation.manuallyInstrument(CallbackManagerModule)
            tracerProvider.register()
        }
        return tracerProvider.getTracer(`phoenix-tracer-${uuidv4().toString()}`)
    } catch (err) {
        if (process.env.DEBUG === 'true') console.error(`Error setting up Phoenix tracer: ${err.message}`)
        return undefined
    }
}

interface OpikTracerOptions {
    apiKey: string
    baseUrl: string
    projectName: string
    workspace: string
    sdkIntegration?: string
    sessionId?: string
    enableCallback?: boolean
}

function getOpikTracer(options: OpikTracerOptions): Tracer | undefined {
    const SEMRESATTRS_PROJECT_NAME = 'openinference.project.name'
    try {
        const traceExporter = new ProtoOTLPTraceExporter({
            url: `${options.baseUrl}/v1/private/otel/v1/traces`,
            headers: {
                Authorization: options.apiKey,
                projectName: options.projectName,
                'Comet-Workspace': options.workspace
            }
        })
        const tracerProvider = new NodeTracerProvider({
            resource: new Resource({
                [ATTR_SERVICE_NAME]: options.projectName,
                [ATTR_SERVICE_VERSION]: '1.0.0',
                [SEMRESATTRS_PROJECT_NAME]: options.projectName
            })
        })
        tracerProvider.addSpanProcessor(new SimpleSpanProcessor(traceExporter))
        if (options.enableCallback) {
            registerInstrumentations({
                instrumentations: []
            })
            const lcInstrumentation = new LangChainInstrumentation()
            lcInstrumentation.manuallyInstrument(CallbackManagerModule)
            tracerProvider.register()
        }
        return tracerProvider.getTracer(`opik-tracer-${uuidv4().toString()}`)
    } catch (err) {
        if (process.env.DEBUG === 'true') console.error(`Error setting up Opik tracer: ${err.message}`)
        return undefined
    }
}

function tryGetJsonSpaces() {
    try {
        return parseInt(getEnvironmentVariable('LOG_JSON_SPACES') ?? '2')
    } catch (err) {
        return 2
    }
}

function tryJsonStringify(obj: unknown, fallback: string) {
    try {
        return JSON.stringify(obj, null, tryGetJsonSpaces())
    } catch (err) {
        return fallback
    }
}

function elapsed(run: Run): string {
    if (!run.end_time || !run.start_time) return ''
    const elapsed = Number(run.end_time) - Number(run.start_time)
    if (elapsed < 1000) {
        return `${elapsed}ms`
    }
    return `${(elapsed / 1000).toFixed(2)}s`
}

export class ConsoleCallbackHandler extends BaseTracer {
    name = 'console_callback_handler' as const
    logger: Logger

    protected persistRun(_run: Run) {
        return Promise.resolve()
    }

    constructor(logger: Logger) {
        super()
        this.logger = logger
        if (getEnvironmentVariable('DEBUG') === 'true') {
            logger.level = getEnvironmentVariable('LOG_LEVEL') ?? 'info'
        }
    }

    getParents(run: Run) {
        const parents: Run[] = []
        let currentRun = run
        while (currentRun.parent_run_id) {
            const parent = this.runMap.get(currentRun.parent_run_id)
            if (parent) {
                parents.push(parent)
                currentRun = parent
            } else {
                break
            }
        }
        return parents
    }

    getBreadcrumbs(run: Run) {
        const parents = this.getParents(run).reverse()
        const string = [...parents, run]
            .map((parent) => {
                const name = `${parent.execution_order}:${parent.run_type}:${parent.name}`
                return name
            })
            .join(' > ')
        return string
    }

    onChainStart(run: Run) {
        const crumbs = this.getBreadcrumbs(run)

        this.logger.verbose(`[chain/start] [${crumbs}] Entering Chain run with input: ${tryJsonStringify(run.inputs, '[inputs]')}`)
    }

    onChainEnd(run: Run) {
        const crumbs = this.getBreadcrumbs(run)
        this.logger.verbose(
            `[chain/end] [${crumbs}] [${elapsed(run)}] Exiting Chain run with output: ${tryJsonStringify(run.outputs, '[outputs]')}`
        )
    }

    onChainError(run: Run) {
        const crumbs = this.getBreadcrumbs(run)
        this.logger.verbose(
            `[chain/error] [${crumbs}] [${elapsed(run)}] Chain run errored with error: ${tryJsonStringify(run.error, '[error]')}`
        )
    }

    onLLMStart(run: Run) {
        const crumbs = this.getBreadcrumbs(run)
        const inputs = 'prompts' in run.inputs ? { prompts: (run.inputs.prompts as string[]).map((p) => p.trim()) } : run.inputs
        this.logger.verbose(`[llm/start] [${crumbs}] Entering LLM run with input: ${tryJsonStringify(inputs, '[inputs]')}`)
    }

    onLLMEnd(run: Run) {
        const crumbs = this.getBreadcrumbs(run)
        this.logger.verbose(
            `[llm/end] [${crumbs}] [${elapsed(run)}] Exiting LLM run with output: ${tryJsonStringify(run.outputs, '[response]')}`
        )
    }

    onLLMError(run: Run) {
        const crumbs = this.getBreadcrumbs(run)
        this.logger.verbose(
            `[llm/error] [${crumbs}] [${elapsed(run)}] LLM run errored with error: ${tryJsonStringify(run.error, '[error]')}`
        )
    }

    onToolStart(run: Run) {
        const crumbs = this.getBreadcrumbs(run)
        this.logger.verbose(`[tool/start] [${crumbs}] Entering Tool run with input: "${run.inputs.input?.trim()}"`)
    }

    onToolEnd(run: Run) {
        const crumbs = this.getBreadcrumbs(run)
        this.logger.verbose(`[tool/end] [${crumbs}] [${elapsed(run)}] Exiting Tool run with output: "${run.outputs?.output?.trim()}"`)
    }

    onToolError(run: Run) {
        const crumbs = this.getBreadcrumbs(run)
        this.logger.verbose(
            `[tool/error] [${crumbs}] [${elapsed(run)}] Tool run errored with error: ${tryJsonStringify(run.error, '[error]')}`
        )
    }

    onAgentAction(run: Run) {
        const agentRun = run as AgentRun
        const crumbs = this.getBreadcrumbs(run)
        this.logger.verbose(
            `[agent/action] [${crumbs}] Agent selected action: ${tryJsonStringify(
                agentRun.actions[agentRun.actions.length - 1],
                '[action]'
            )}`
        )
    }
}

/**
 * Custom chain handler class
 */
export class CustomChainHandler extends BaseCallbackHandler {
    name = 'custom_chain_handler'
    isLLMStarted = false
    skipK = 0 // Skip streaming for first K numbers of handleLLMStart
    returnSourceDocuments = false
    cachedResponse = true
    chatId: string = ''
    sseStreamer: IServerSideEventStreamer | undefined

    constructor(sseStreamer: IServerSideEventStreamer | undefined, chatId: string, skipK?: number, returnSourceDocuments?: boolean) {
        super()
        this.sseStreamer = sseStreamer
        this.chatId = chatId
        this.skipK = skipK ?? this.skipK
        this.returnSourceDocuments = returnSourceDocuments ?? this.returnSourceDocuments
    }

    handleLLMStart() {
        this.cachedResponse = false
        if (this.skipK > 0) this.skipK -= 1
    }

    handleLLMNewToken(
        token: string,
        idx?: NewTokenIndices,
        runId?: string,
        parentRunId?: string,
        tags?: string[],
        fields?: HandleLLMNewTokenCallbackFields
    ): void | Promise<void> {
        if (this.skipK === 0) {
            if (!this.isLLMStarted) {
                this.isLLMStarted = true
                if (this.sseStreamer) {
                    this.sseStreamer.streamStartEvent(this.chatId, token)
                }
            }
            if (this.sseStreamer) {
                if (token) {
                    const chunk = fields?.chunk as ChatGenerationChunk
                    const message = chunk?.message as AIMessageChunk
                    const toolCalls = message?.tool_call_chunks || []

                    // Only stream when token is not empty and not a tool call
                    if (toolCalls.length === 0) {
                        this.sseStreamer.streamTokenEvent(this.chatId, token)
                    }
                }
            }
        }
    }

    handleLLMEnd() {
        if (this.sseStreamer) {
            this.sseStreamer.streamEndEvent(this.chatId)
        }
    }

    handleChainEnd(outputs: ChainValues, _: string, parentRunId?: string): void | Promise<void> {
        /*
            Langchain does not call handleLLMStart, handleLLMEnd, handleLLMNewToken when the chain is cached.
            Callback Order is "Chain Start -> LLM Start --> LLM Token --> LLM End -> Chain End" for normal responses.
            Callback Order is "Chain Start -> Chain End" for cached responses.
         */
        if (this.cachedResponse && parentRunId === undefined) {
            const cachedValue = outputs.text || outputs.response || outputs.output || outputs.output_text
            //split at whitespace, and keep the whitespace. This is to preserve the original formatting.
            const result = cachedValue.split(/(\s+)/)
            result.forEach((token: string, index: number) => {
                if (index === 0) {
                    if (this.sseStreamer) {
                        this.sseStreamer.streamStartEvent(this.chatId, token)
                    }
                }
                if (this.sseStreamer) {
                    this.sseStreamer.streamTokenEvent(this.chatId, token)
                }
            })
            if (this.returnSourceDocuments && this.sseStreamer) {
                this.sseStreamer.streamSourceDocumentsEvent(this.chatId, outputs?.sourceDocuments)
            }
            if (this.sseStreamer) {
                this.sseStreamer.streamEndEvent(this.chatId)
            }
        } else {
            if (this.returnSourceDocuments && this.sseStreamer) {
                this.sseStreamer.streamSourceDocumentsEvent(this.chatId, outputs?.sourceDocuments)
            }
        }
    }
}

class ExtendedLunaryHandler extends LunaryHandler {
    chatId: string
    appDataSource: DataSource
    databaseEntities: IDatabaseEntity
    currentRunId: string | null
    thread: any
    apiMessageId: string

    constructor({ flowiseOptions, ...options }: any) {
        super(options)
        this.appDataSource = flowiseOptions.appDataSource
        this.databaseEntities = flowiseOptions.databaseEntities
        this.chatId = flowiseOptions.chatId
        this.apiMessageId = flowiseOptions.apiMessageId
    }

    async initThread() {
        const entity = await this.appDataSource.getRepository(this.databaseEntities['Lead']).findOne({
            where: {
                chatId: this.chatId
            }
        })

        const userId = entity?.email ?? entity?.id

        this.thread = lunary.openThread({
            id: this.chatId,
            userId,
            userProps: userId
                ? {
                      name: entity?.name ?? undefined,
                      email: entity?.email ?? undefined,
                      phone: entity?.phone ?? undefined
                  }
                : undefined
        })
    }

    async handleChainStart(chain: any, inputs: any, runId: string, parentRunId?: string, tags?: string[], metadata?: any): Promise<void> {
        // First chain (no parent run id) is the user message
        if (this.chatId && !parentRunId) {
            if (!this.thread) {
                await this.initThread()
            }

            const messageText = inputs.input || inputs.question

            const messageId = this.thread.trackMessage({
                content: messageText,
                role: 'user'
            })

            // Track top level chain id for knowing when we got the final reply
            this.currentRunId = runId

            // Use the messageId as the parent of the chain for reconciliation
            super.handleChainStart(chain, inputs, runId, messageId, tags, metadata)
        } else {
            super.handleChainStart(chain, inputs, runId, parentRunId, tags, metadata)
        }
    }

    async handleChainEnd(outputs: ChainValues, runId: string): Promise<void> {
        if (this.chatId && runId === this.currentRunId) {
            const answer = outputs.output

            this.thread.trackMessage({
                id: this.apiMessageId,
                content: answer,
                role: 'assistant'
            })

            this.currentRunId = null
        }

        super.handleChainEnd(outputs, runId)
    }
}

export const additionalCallbacks = async (nodeData: INodeData, options: ICommonObject) => {
    try {
        const analytic = applyEnvAnalyticsOverrides(options.analytic)
        if (Object.keys(analytic).length === 0) return []

        const callbacks: any = []
        const parentLangfuseTrace = options.parentLangfuseTrace as LangfuseTraceClient | undefined
        const parentLangfuseSpan = options.parentLangfuseSpan as LangfuseSpanClient | undefined
        const analyticHandlersInstance = options.analyticHandlers as AnalyticHandler | undefined

        for (const provider in analytic) {
            const providerStatus = analytic[provider].status as boolean
            if (providerStatus) {
                const credentialId = analytic[provider].credentialId as string
                const credentialData = await getCredentialData(credentialId ?? '', options)
                if (provider === 'langSmith') {
                    const langSmithProject = analytic[provider].projectName as string

                    const langSmithApiKey = getCredentialParam('langSmithApiKey', credentialData, nodeData)
                    const langSmithEndpoint = getCredentialParam('langSmithEndpoint', credentialData, nodeData)

                    const client = new Client({
                        apiUrl: langSmithEndpoint ?? 'https://api.smith.langchain.com',
                        apiKey: langSmithApiKey
                    })

                    let langSmithField: LangChainTracerFields = {
                        projectName: langSmithProject ?? 'default',
                        //@ts-ignore
                        client
                    }

                    if (nodeData?.inputs?.analytics?.langSmith) {
                        langSmithField = { ...langSmithField, ...nodeData?.inputs?.analytics?.langSmith }
                    }

                    const tracer = new LangChainTracer(langSmithField)
                    callbacks.push(tracer)
                } else if (provider === 'langFuse') {
                    //console.debug('Starting LangFuse configuration for provider:', provider)

                    // const release = analytic[provider].release as string
                    //console.debug('Release:', release)

                    const langFuseSecretKey =
                        analytic[provider]?.secretKey ?? getCredentialParam('langFuseSecretKey', credentialData, nodeData)
                    //console.debug('LangFuse Secret Key:', langFuseSecretKey)

                    const langFusePublicKey =
                        analytic[provider]?.publicKey ?? getCredentialParam('langFusePublicKey', credentialData, nodeData)
                    //console.debug('LangFuse Public Key:', langFusePublicKey)

                    const langFuseEndpoint =
                        analytic[provider]?.endpoint ?? getCredentialParam('langFuseEndpoint', credentialData, nodeData)
                    //console.debug('LangFuse Endpoint:', langFuseEndpoint)

                    // const langfuse = new Langfuse()
                    //console.debug('Langfuse instance created.')

                    const chatflow = await options.appDataSource
                        .getRepository(options.databaseEntities['ChatFlow'])
                        .findOneBy({ id: options.chatflowid })

                    // Default to platform if no chatflow found
                    let aiCredentialsOwnership = 'platform'

                    if (chatflow?.flowData) {
                        const extracted = extractCredentialsAndModels(chatflow.flowData)

                        // Fast path: AAI nodes = platform
                        if (!extracted.hasPlatformAINodes && extracted.credentials.length > 0) {
                            const credentials = await options.appDataSource
                                .getRepository(options.databaseEntities['Credential'])
                                .findBy({ id: In(extracted.credentials.map((c) => c.credentialId)) })

                            aiCredentialsOwnership = credentials.every((c: any) => !c.visibility?.includes('Platform'))
                                ? 'user'
                                : 'platform'
                        }
                    }

                    let langFuseOptions = {
                        secretKey: langFuseSecretKey,
                        publicKey: langFusePublicKey,
                        baseUrl: langFuseEndpoint ?? 'https://cloud.langfuse.com'
                    }
                    // console.debug('LangFuse Options:', langFuseOptions)
                    // console.debug('User:', options?.user)
                    // console.debug('Options:', options)

                    if (nodeData?.inputs?.analytics?.langFuse) {
                        langFuseOptions = { ...langFuseOptions, ...nodeData?.inputs?.analytics?.langFuse }
                        //console.debug('LangFuse Options updated with nodeData inputs:', langFuseOptions)
                    }
                    const metadata: TraceMetadata = {
                        name: `${chatflow.id}`,
                        chatflowName: chatflow.name,
                        chatId: options.chatId,
                        chatflowid: options.chatflowid,
                        userId: options?.user?.id,
                        customerId: options.user?.stripeCustomerId,
                        stripeCustomerId: options.user?.stripeCustomerId,
                        organizationId: options.user?.organizationId,
                        aiCredentialsOwnership: aiCredentialsOwnership,
                        messageId: options.messageId,
                        sessionId: options.sessionId,
                        ...(options.trackingMetadata &&
                            Object.keys(options.trackingMetadata).reduce((acc, key) => {
                                acc[`tracking_${key}`] = options.trackingMetadata![key]
                                return acc
                            }, {} as Record<string, any>))
                    }
                    // const trace = langfuse.trace({
                    //     tags: [`Name:${chatflow.name}`],
                    //     name: `${chatflow.id}`,
                    //     version: chatflow.updatedDate,
                    //     userId: options?.user?.id,
                    //     sessionId: options.sessionId,
                    //     metadata: metadata
                    // })

                    const handlerConfig: ICommonObject = {
                        ...langFuseOptions,
                        metadata: metadata,
                        userId: options?.user?.id,
                        sessionId: options.sessionId,
                        tags: [`Name:${chatflow.name}`],
                        version: chatflow.updatedDate
                        // TODO: This is still causing an error
                        // This works to keep the root trace name and have everything else update on the root trace
                        // BUT Everything gets updatedon the root trace so the attributes and metadata are inconsistent
                        // root: trace,
                        // updateRoot: true
                    }

                    if (parentLangfuseSpan || parentLangfuseTrace) {
                        handlerConfig.root = parentLangfuseSpan ?? parentLangfuseTrace
                        handlerConfig.updateRoot = false

                        try {
                            if (parentLangfuseTrace) {
                                parentLangfuseTrace.update({
                                    tags: [`Name:${chatflow.name}`],
                                    metadata,
                                    userId: options?.user?.id,
                                    sessionId: options.sessionId,
                                    version: chatflow.updatedDate
                                })
                            }
                        } catch (err) {
                            if (process.env.DEBUG === 'true') {
                                console.error('Error updating Langfuse parent trace metadata:', err)
                            }
                        }

                        analyticHandlersInstance?.setLangfuseCallbacksActive(true)
                    } else {
                        analyticHandlersInstance?.setLangfuseCallbacksActive(false)
                    }

                    const handler = new CallbackHandler(handlerConfig)

                    callbacks.push(handler)
                    //console.debug('Handler added to callbacks.')
                } else if (provider === 'lunary') {
                    const lunaryPublicKey = getCredentialParam('lunaryAppId', credentialData, nodeData)
                    const lunaryEndpoint = getCredentialParam('lunaryEndpoint', credentialData, nodeData)

                    let lunaryFields = {
                        publicKey: lunaryPublicKey,
                        apiUrl: lunaryEndpoint ?? 'https://api.lunary.ai',
                        runtime: 'flowise',
                        flowiseOptions: options
                    }

                    if (nodeData?.inputs?.analytics?.lunary) {
                        lunaryFields = { ...lunaryFields, ...nodeData?.inputs?.analytics?.lunary }
                    }

                    const handler = new ExtendedLunaryHandler(lunaryFields)

                    callbacks.push(handler)
                } else if (provider === 'langWatch') {
                    const langWatchApiKey = getCredentialParam('langWatchApiKey', credentialData, nodeData)
                    const langWatchEndpoint = getCredentialParam('langWatchEndpoint', credentialData, nodeData)

                    const langwatch = new LangWatch({
                        apiKey: langWatchApiKey,
                        endpoint: langWatchEndpoint
                    })

                    const trace = langwatch.getTrace()
                    callbacks.push(trace.getLangChainCallback())
                } else if (provider === 'arize') {
                    const arizeApiKey = getCredentialParam('arizeApiKey', credentialData, nodeData)
                    const arizeSpaceId = getCredentialParam('arizeSpaceId', credentialData, nodeData)
                    const arizeEndpoint = getCredentialParam('arizeEndpoint', credentialData, nodeData)
                    const arizeProject = analytic[provider].projectName as string

                    let arizeOptions: ArizeTracerOptions = {
                        apiKey: arizeApiKey,
                        spaceId: arizeSpaceId,
                        baseUrl: arizeEndpoint ?? 'https://otlp.arize.com',
                        projectName: arizeProject ?? 'default',
                        sdkIntegration: 'Flowise',
                        enableCallback: true
                    }

                    if (options.chatId) arizeOptions.sessionId = options.chatId
                    if (nodeData?.inputs?.analytics?.arize) {
                        arizeOptions = { ...arizeOptions, ...nodeData?.inputs?.analytics?.arize }
                    }

                    const tracer: Tracer | undefined = getArizeTracer(arizeOptions)
                    callbacks.push(tracer)
                } else if (provider === 'phoenix') {
                    const phoenixApiKey = getCredentialParam('phoenixApiKey', credentialData, nodeData)
                    const phoenixEndpoint = getCredentialParam('phoenixEndpoint', credentialData, nodeData)
                    const phoenixProject = analytic[provider].projectName as string

                    let phoenixOptions: PhoenixTracerOptions = {
                        apiKey: phoenixApiKey,
                        baseUrl: phoenixEndpoint ?? 'https://app.phoenix.arize.com',
                        projectName: phoenixProject ?? 'default',
                        sdkIntegration: 'Flowise',
                        enableCallback: true
                    }

                    if (options.chatId) phoenixOptions.sessionId = options.chatId
                    if (nodeData?.inputs?.analytics?.phoenix) {
                        phoenixOptions = { ...phoenixOptions, ...nodeData?.inputs?.analytics?.phoenix }
                    }

                    const tracer: Tracer | undefined = getPhoenixTracer(phoenixOptions)
                    callbacks.push(tracer)
                } else if (provider === 'opik') {
                    const opikApiKey = getCredentialParam('opikApiKey', credentialData, nodeData)
                    const opikEndpoint = getCredentialParam('opikUrl', credentialData, nodeData)
                    const opikWorkspace = getCredentialParam('opikWorkspace', credentialData, nodeData)
                    const opikProject = analytic[provider].opikProjectName as string

                    let opikOptions: OpikTracerOptions = {
                        apiKey: opikApiKey,
                        baseUrl: opikEndpoint ?? 'https://www.comet.com/opik/api',
                        projectName: opikProject ?? 'default',
                        workspace: opikWorkspace ?? 'default',
                        sdkIntegration: 'Flowise',
                        enableCallback: true
                    }

                    if (options.chatId) opikOptions.sessionId = options.chatId
                    if (nodeData?.inputs?.analytics?.opik) {
                        opikOptions = { ...opikOptions, ...nodeData?.inputs?.analytics?.opik }
                    }

                    const tracer: Tracer | undefined = getOpikTracer(opikOptions)
                    callbacks.push(tracer)
                } else if (provider === 'jlinc') {
                    const dataStoreApiUrl = getCredentialParam('dataStoreApiUrl', credentialData, nodeData)
                    const dataStoreApiKey = getCredentialParam('dataStoreApiKey', credentialData, nodeData)
                    const archiveApiUrl = getCredentialParam('archiveApiUrl', credentialData, nodeData)
                    const archiveApiKey = getCredentialParam('archiveApiKey', credentialData, nodeData)
                    let agreementId = analytic[provider].agreementId as string
                    if (!agreementId || agreementId === '') {
                        agreementId = '00000000-0000-0000-0000-000000000000'
                    }
                    const systemPrefix = analytic[provider].systemPrefix as string
                    const tracer = new JLINCTracer({
                        dataStoreApiUrl,
                        dataStoreApiKey,
                        archiveApiUrl,
                        archiveApiKey,
                        agreementId,
                        systemPrefix,
                        debug: false
                    })
                    callbacks.push(tracer)
                }
            }
        }
        // callbacks.push(new BillingCallbackHandler())
        return callbacks
    } catch (e: any) {
        console.error('Error in additionalCallbacks:', e)
        throw new Error(e)
    }
}

export class AnalyticHandler {
    private static instances: Map<string, AnalyticHandler> = new Map()
    private nodeData: INodeData
    private options: ICommonObject
    private handlers: ICommonObject = {}
    private initialized: boolean = false
    private analyticsConfig: string | undefined
    private chatId: string
    private createdAt: number
    private langfuseCallbacksActive = false
    private useNodeLevelLangfuseSpans = false

    private constructor(nodeData: INodeData, options: ICommonObject) {
        this.nodeData = nodeData
        this.options = options
        this.analyticsConfig = JSON.stringify(applyEnvAnalyticsOverrides(options.analytic))
        this.chatId = options.chatId
        this.createdAt = Date.now()
        this.useNodeLevelLangfuseSpans = Boolean(options.useNodeLevelLangfuseSpans)
    }

    static getInstance(nodeData: INodeData, options: ICommonObject): AnalyticHandler {
        const chatId = options.chatId
        if (!chatId) throw new Error('ChatId is required for analytics')

        // Reset instance if analytics config changed for this chat
        const instance = AnalyticHandler.instances.get(chatId)
        const currentProcessedConfig = JSON.stringify(applyEnvAnalyticsOverrides(options.analytic))
        if (instance?.analyticsConfig !== currentProcessedConfig) {
            AnalyticHandler.resetInstance(chatId)
        }

        if (!AnalyticHandler.instances.get(chatId)) {
            AnalyticHandler.instances.set(chatId, new AnalyticHandler(nodeData, options))
        }
        return AnalyticHandler.instances.get(chatId)!
    }

    static resetInstance(chatId: string): void {
        AnalyticHandler.instances.delete(chatId)
    }

    // Keep this as backup for orphaned instances
    static cleanup(maxAge: number = 3600000): void {
        const now = Date.now()
        for (const [chatId, instance] of AnalyticHandler.instances) {
            if (now - instance.createdAt > maxAge) {
                AnalyticHandler.resetInstance(chatId)
            }
        }
    }

    async init() {
        if (this.initialized) return

        try {
            const analytic = applyEnvAnalyticsOverrides(this.options.analytic)
            if (Object.keys(analytic).length === 0) return

            for (const provider in analytic) {
                const providerStatus = analytic[provider].status as boolean
                if (providerStatus) {
                    const credentialId = analytic[provider].credentialId as string
                    const credentialData = await getCredentialData(credentialId ?? '', this.options)
                    await this.initializeProvider(provider, analytic[provider], credentialData)
                }
            }
            this.initialized = true
        } catch (e) {
            throw new Error(e)
        }
    }

    // Add getter for handlers (useful for debugging)
    getHandlers(): ICommonObject {
        return this.handlers
    }

    setLangfuseCallbacksActive(active: boolean) {
        this.langfuseCallbacksActive = active
    }

    isLangfuseCallbacksActive(): boolean {
        return this.langfuseCallbacksActive
    }

    getParentTraceClient(provider: 'langFuse', traceId: string): LangfuseTraceClient | undefined {
        if (!traceId) return undefined
        const providerHandler = this.handlers[provider] as ICommonObject | undefined
        const traces = providerHandler?.trace as Record<string, LangfuseTraceClient> | undefined
        if (!traces) return undefined
        return traces[traceId]
    }

    async initializeProvider(provider: string, providerConfig: any, credentialData: any) {
        if (provider === 'langSmith') {
            const langSmithProject = providerConfig.projectName as string
            const langSmithApiKey = getCredentialParam('langSmithApiKey', credentialData, this.nodeData)
            const langSmithEndpoint = getCredentialParam('langSmithEndpoint', credentialData, this.nodeData)

            const client = new LangsmithClient({
                apiUrl: langSmithEndpoint ?? 'https://api.smith.langchain.com',
                apiKey: langSmithApiKey
            })

            this.handlers['langSmith'] = { client, langSmithProject }
        } else if (provider === 'langFuse') {
            const release = providerConfig.release as string
            const langFuseSecretKey = providerConfig?.secretKey ?? getCredentialParam('langFuseSecretKey', credentialData, this.nodeData)
            const langFusePublicKey = providerConfig?.publicKey ?? getCredentialParam('langFusePublicKey', credentialData, this.nodeData)
            const langFuseEndpoint = providerConfig?.endpoint ?? getCredentialParam('langFuseEndpoint', credentialData, this.nodeData)

            const langfuse = new Langfuse({
                secretKey: langFuseSecretKey,
                publicKey: langFusePublicKey,
                baseUrl: langFuseEndpoint ?? 'https://cloud.langfuse.com',
                sdkIntegration: 'Flowise',
                release
            })
            this.handlers['langFuse'] = { client: langfuse }
        } else if (provider === 'lunary') {
            const lunaryPublicKey = getCredentialParam('lunaryAppId', credentialData, this.nodeData)
            const lunaryEndpoint = getCredentialParam('lunaryEndpoint', credentialData, this.nodeData)

            lunary.init({
                publicKey: lunaryPublicKey,
                apiUrl: lunaryEndpoint,
                runtime: 'flowise'
            })

            this.handlers['lunary'] = { client: lunary }
        } else if (provider === 'langWatch') {
            const langWatchApiKey = getCredentialParam('langWatchApiKey', credentialData, this.nodeData)
            const langWatchEndpoint = getCredentialParam('langWatchEndpoint', credentialData, this.nodeData)

            const langwatch = new LangWatch({
                apiKey: langWatchApiKey,
                endpoint: langWatchEndpoint
            })

            this.handlers['langWatch'] = { client: langwatch }
        } else if (provider === 'arize') {
            const arizeApiKey = getCredentialParam('arizeApiKey', credentialData, this.nodeData)
            const arizeSpaceId = getCredentialParam('arizeSpaceId', credentialData, this.nodeData)
            const arizeEndpoint = getCredentialParam('arizeEndpoint', credentialData, this.nodeData)
            const arizeProject = providerConfig.projectName as string

            let arizeOptions: ArizeTracerOptions = {
                apiKey: arizeApiKey,
                spaceId: arizeSpaceId,
                baseUrl: arizeEndpoint ?? 'https://otlp.arize.com',
                projectName: arizeProject ?? 'default',
                sdkIntegration: 'Flowise',
                enableCallback: false
            }

            const arize: Tracer | undefined = getArizeTracer(arizeOptions)
            const rootSpan: Span | undefined = undefined

            this.handlers['arize'] = { client: arize, arizeProject, rootSpan }
        } else if (provider === 'phoenix') {
            const phoenixApiKey = getCredentialParam('phoenixApiKey', credentialData, this.nodeData)
            const phoenixEndpoint = getCredentialParam('phoenixEndpoint', credentialData, this.nodeData)
            const phoenixProject = providerConfig.projectName as string

            let phoenixOptions: PhoenixTracerOptions = {
                apiKey: phoenixApiKey,
                baseUrl: phoenixEndpoint ?? 'https://app.phoenix.arize.com',
                projectName: phoenixProject ?? 'default',
                sdkIntegration: 'Flowise',
                enableCallback: false
            }

            const phoenix: Tracer | undefined = getPhoenixTracer(phoenixOptions)
            const rootSpan: Span | undefined = undefined

            this.handlers['phoenix'] = { client: phoenix, phoenixProject, rootSpan }
        } else if (provider === 'opik') {
            const opikApiKey = getCredentialParam('opikApiKey', credentialData, this.nodeData)
            const opikEndpoint = getCredentialParam('opikUrl', credentialData, this.nodeData)
            const opikWorkspace = getCredentialParam('opikWorkspace', credentialData, this.nodeData)
            const opikProject = providerConfig.opikProjectName as string

            let opikOptions: OpikTracerOptions = {
                apiKey: opikApiKey,
                baseUrl: opikEndpoint ?? 'https://www.comet.com/opik/api',
                projectName: opikProject ?? 'default',
                workspace: opikWorkspace ?? 'default',
                sdkIntegration: 'Flowise',
                enableCallback: false
            }

            const opik: Tracer | undefined = getOpikTracer(opikOptions)
            const rootSpan: Span | undefined = undefined

            this.handlers['opik'] = { client: opik, opikProject, rootSpan }
        }
    }

    async onChainStart(name: string, input: string, parentIds?: ICommonObject) {
        const returnIds: ICommonObject = {
            langSmith: {},
            langFuse: {},
            lunary: {},
            langWatch: {},
            arize: {},
            phoenix: {},
            opik: {}
        }

        if (Object.prototype.hasOwnProperty.call(this.handlers, 'langSmith')) {
            if (!parentIds || !Object.keys(parentIds).length) {
                const parentRunConfig: RunTreeConfig = {
                    name,
                    run_type: 'chain',
                    inputs: {
                        text: input
                    },
                    serialized: {},
                    project_name: this.handlers['langSmith'].langSmithProject,
                    client: this.handlers['langSmith'].client,
                    ...this.nodeData?.inputs?.analytics?.langSmith
                }
                const parentRun = new RunTree(parentRunConfig)
                await parentRun.postRun()
                this.handlers['langSmith'].chainRun = { [parentRun.id]: parentRun }
                returnIds['langSmith'].chainRun = parentRun.id
            } else {
                const parentRun: RunTree | undefined = this.handlers['langSmith'].chainRun[parentIds['langSmith'].chainRun]
                if (parentRun) {
                    const childChainRun = await parentRun.createChild({
                        name,
                        run_type: 'chain',
                        inputs: {
                            text: input
                        }
                    })
                    await childChainRun.postRun()
                    this.handlers['langSmith'].chainRun = { [childChainRun.id]: childChainRun }
                    returnIds['langSmith'].chainRun = childChainRun.id
                }
            }
        }

        if (Object.prototype.hasOwnProperty.call(this.handlers, 'langFuse')) {
            let langfuseTraceClient: LangfuseTraceClient

            if (!parentIds || !Object.keys(parentIds).length) {
                const langfuse: Langfuse = this.handlers['langFuse'].client
                langfuseTraceClient = langfuse.trace({
                    name,
                    sessionId: this.options.chatId,
                    metadata: { tags: ['openai-assistant'] },
                    ...this.nodeData?.inputs?.analytics?.langFuse
                })
                // console.log(`Langfuse trace created: ${langfuseTraceClient.id}`)
            } else {
                langfuseTraceClient = this.handlers['langFuse'].trace[parentIds['langFuse']]
                // console.log(`Langfuse trace retrieved: ${langfuseTraceClient.id}`)
            }

            if (langfuseTraceClient) {
                langfuseTraceClient.update({
                    input: {
                        text: input
                    }
                })
                const span = langfuseTraceClient.span({
                    name,
                    input: {
                        text: input
                    }
                })
                this.handlers['langFuse'].trace = { [langfuseTraceClient.id]: langfuseTraceClient }
                this.handlers['langFuse'].span = { [span.id]: span }
                returnIds['langFuse'].trace = langfuseTraceClient.id
                returnIds['langFuse'].span = span.id
                // console.log(`Langfuse span created: ${span.id}`)
            }
        }

        if (Object.prototype.hasOwnProperty.call(this.handlers, 'lunary')) {
            const monitor = this.handlers['lunary'].client

            if (monitor) {
                const runId = uuidv4()
                await monitor.trackEvent('chain', 'start', {
                    runId,
                    name,
                    input,
                    ...this.nodeData?.inputs?.analytics?.lunary
                })
                this.handlers['lunary'].chainEvent = { [runId]: runId }
                returnIds['lunary'].chainEvent = runId
            }
        }

        if (Object.prototype.hasOwnProperty.call(this.handlers, 'langWatch')) {
            let langwatchTrace: LangWatchTrace

            if (!parentIds || !Object.keys(parentIds).length) {
                const langwatch: LangWatch = this.handlers['langWatch'].client
                langwatchTrace = langwatch.getTrace({
                    name,
                    metadata: { tags: ['openai-assistant'], threadId: this.options.chatId },
                    ...this.nodeData?.inputs?.analytics?.langWatch
                })
            } else {
                langwatchTrace = this.handlers['langWatch'].trace[parentIds['langWatch']]
            }

            if (langwatchTrace) {
                const span = langwatchTrace.startSpan({
                    name,
                    type: 'chain',
                    input: autoconvertTypedValues(input)
                })
                this.handlers['langWatch'].trace = { [langwatchTrace.traceId]: langwatchTrace }
                this.handlers['langWatch'].span = { [span.spanId]: span }
                returnIds['langWatch'].trace = langwatchTrace.traceId
                returnIds['langWatch'].span = span.spanId
            }
        }

        if (Object.prototype.hasOwnProperty.call(this.handlers, 'arize')) {
            const tracer: Tracer | undefined = this.handlers['arize'].client
            let rootSpan: Span | undefined = this.handlers['arize'].rootSpan

            if (!parentIds || !Object.keys(parentIds).length) {
                rootSpan = tracer ? tracer.startSpan('Flowise') : undefined
                if (rootSpan) {
                    rootSpan.setAttribute('session.id', this.options.chatId)
                    rootSpan.setAttribute('openinference.span.kind', 'CHAIN')
                    rootSpan.setAttribute('input.value', input)
                    rootSpan.setAttribute('input.mime_type', 'text/plain')
                    rootSpan.setAttribute('output.value', '[Object]')
                    rootSpan.setAttribute('output.mime_type', 'text/plain')
                    rootSpan.setStatus({ code: SpanStatusCode.OK })
                    rootSpan.end()
                }
                this.handlers['arize'].rootSpan = rootSpan
            }

            const rootSpanContext = rootSpan
                ? opentelemetry.trace.setSpan(opentelemetry.context.active(), rootSpan as Span)
                : opentelemetry.context.active()
            const chainSpan = tracer?.startSpan(name, undefined, rootSpanContext)
            if (chainSpan) {
                chainSpan.setAttribute('openinference.span.kind', 'CHAIN')
                chainSpan.setAttribute('input.value', JSON.stringify(input))
                chainSpan.setAttribute('input.mime_type', 'application/json')
            }
            const chainSpanId: any = chainSpan?.spanContext().spanId

            this.handlers['arize'].chainSpan = { [chainSpanId]: chainSpan }
            returnIds['arize'].chainSpan = chainSpanId
        }

        if (Object.prototype.hasOwnProperty.call(this.handlers, 'phoenix')) {
            const tracer: Tracer | undefined = this.handlers['phoenix'].client
            let rootSpan: Span | undefined = this.handlers['phoenix'].rootSpan

            if (!parentIds || !Object.keys(parentIds).length) {
                rootSpan = tracer ? tracer.startSpan('Flowise') : undefined
                if (rootSpan) {
                    rootSpan.setAttribute('session.id', this.options.chatId)
                    rootSpan.setAttribute('openinference.span.kind', 'CHAIN')
                    rootSpan.setAttribute('input.value', input)
                    rootSpan.setAttribute('input.mime_type', 'text/plain')
                    rootSpan.setAttribute('output.value', '[Object]')
                    rootSpan.setAttribute('output.mime_type', 'text/plain')
                    rootSpan.setStatus({ code: SpanStatusCode.OK })
                    rootSpan.end()
                }
                this.handlers['phoenix'].rootSpan = rootSpan
            }

            const rootSpanContext = rootSpan
                ? opentelemetry.trace.setSpan(opentelemetry.context.active(), rootSpan as Span)
                : opentelemetry.context.active()
            const chainSpan = tracer?.startSpan(name, undefined, rootSpanContext)
            if (chainSpan) {
                chainSpan.setAttribute('openinference.span.kind', 'CHAIN')
                chainSpan.setAttribute('input.value', JSON.stringify(input))
                chainSpan.setAttribute('input.mime_type', 'application/json')
            }
            const chainSpanId: any = chainSpan?.spanContext().spanId

            this.handlers['phoenix'].chainSpan = { [chainSpanId]: chainSpan }
            returnIds['phoenix'].chainSpan = chainSpanId
        }

        if (Object.prototype.hasOwnProperty.call(this.handlers, 'opik')) {
            const tracer: Tracer | undefined = this.handlers['opik'].client
            let rootSpan: Span | undefined = this.handlers['opik'].rootSpan

            if (!parentIds || !Object.keys(parentIds).length) {
                rootSpan = tracer ? tracer.startSpan('Flowise') : undefined
                if (rootSpan) {
                    rootSpan.setAttribute('session.id', this.options.chatId)
                    rootSpan.setAttribute('openinference.span.kind', 'CHAIN')
                    rootSpan.setAttribute('input.value', input)
                    rootSpan.setAttribute('input.mime_type', 'text/plain')
                    rootSpan.setAttribute('output.value', '[Object]')
                    rootSpan.setAttribute('output.mime_type', 'text/plain')
                    rootSpan.setStatus({ code: SpanStatusCode.OK })
                    rootSpan.end()
                }
                this.handlers['opik'].rootSpan = rootSpan
            }

            const rootSpanContext = rootSpan
                ? opentelemetry.trace.setSpan(opentelemetry.context.active(), rootSpan as Span)
                : opentelemetry.context.active()
            const chainSpan = tracer?.startSpan(name, undefined, rootSpanContext)
            if (chainSpan) {
                chainSpan.setAttribute('openinference.span.kind', 'CHAIN')
                chainSpan.setAttribute('input.value', JSON.stringify(input))
                chainSpan.setAttribute('input.mime_type', 'application/json')
            }
            const chainSpanId: any = chainSpan?.spanContext().spanId

            this.handlers['opik'].chainSpan = { [chainSpanId]: chainSpan }
            returnIds['opik'].chainSpan = chainSpanId
        }

        return returnIds
    }

    async onChainEnd(returnIds: ICommonObject, output: string | object, shutdown = false) {
        if (Object.prototype.hasOwnProperty.call(this.handlers, 'langSmith')) {
            const chainRun: RunTree | undefined = this.handlers['langSmith'].chainRun[returnIds['langSmith'].chainRun]
            if (chainRun) {
                await chainRun.end({
                    outputs: {
                        output
                    }
                })
                await chainRun.patchRun()
            }
        }

        if (Object.prototype.hasOwnProperty.call(this.handlers, 'langFuse')) {
            const span: LangfuseSpanClient | undefined = this.handlers['langFuse'].span[returnIds['langFuse'].span]
            if (span) {
                span.end({
                    output
                })
                const langfuseTraceClient = this.handlers['langFuse'].trace[returnIds['langFuse'].trace]
                if (langfuseTraceClient) {
                    langfuseTraceClient.update({
                        output: {
                            output
                        }
                    })
                }
                // console.log('test', langfuseTraceClient)
                if (shutdown) {
                    const langfuse: Langfuse = this.handlers['langFuse'].client
                    await langfuse.shutdownAsync()
                    // console.log('Langfuse shutdown completed')
                }
            }
        }

        if (Object.prototype.hasOwnProperty.call(this.handlers, 'lunary')) {
            const chainEventId = returnIds['lunary'].chainEvent
            const monitor = this.handlers['lunary'].client

            if (monitor && chainEventId) {
                await monitor.trackEvent('chain', 'end', {
                    runId: chainEventId,
                    output
                })
            }
        }

        if (Object.prototype.hasOwnProperty.call(this.handlers, 'langWatch')) {
            const span: LangWatchSpan | undefined = this.handlers['langWatch'].span[returnIds['langWatch'].span]
            if (span) {
                span.end({
                    output: autoconvertTypedValues(output)
                })
            }
        }

        if (Object.prototype.hasOwnProperty.call(this.handlers, 'arize')) {
            const chainSpan: Span | undefined = this.handlers['arize'].chainSpan[returnIds['arize'].chainSpan]
            if (chainSpan) {
                chainSpan.setAttribute('output.value', JSON.stringify(output))
                chainSpan.setAttribute('output.mime_type', 'application/json')
                chainSpan.setStatus({ code: SpanStatusCode.OK })
                chainSpan.end()
            }
        }

        if (Object.prototype.hasOwnProperty.call(this.handlers, 'phoenix')) {
            const chainSpan: Span | undefined = this.handlers['phoenix'].chainSpan[returnIds['phoenix'].chainSpan]
            if (chainSpan) {
                chainSpan.setAttribute('output.value', JSON.stringify(output))
                chainSpan.setAttribute('output.mime_type', 'application/json')
                chainSpan.setStatus({ code: SpanStatusCode.OK })
                chainSpan.end()
            }
        }

        if (Object.prototype.hasOwnProperty.call(this.handlers, 'opik')) {
            const chainSpan: Span | undefined = this.handlers['opik'].chainSpan[returnIds['opik'].chainSpan]
            if (chainSpan) {
                chainSpan.setAttribute('output.value', JSON.stringify(output))
                chainSpan.setAttribute('output.mime_type', 'application/json')
                chainSpan.setStatus({ code: SpanStatusCode.OK })
                chainSpan.end()
            }
        }

        if (shutdown) {
            // Cleanup this instance when chain ends
            AnalyticHandler.resetInstance(this.chatId)
        }
    }

    async onChainError(returnIds: ICommonObject, error: string | object, shutdown = false) {
        if (Object.prototype.hasOwnProperty.call(this.handlers, 'langSmith')) {
            const chainRun: RunTree | undefined = this.handlers['langSmith'].chainRun[returnIds['langSmith'].chainRun]
            if (chainRun) {
                await chainRun.end({
                    error: {
                        error
                    }
                })
                await chainRun.patchRun()
            }
        }

        if (Object.prototype.hasOwnProperty.call(this.handlers, 'langFuse')) {
            const span: LangfuseSpanClient | undefined = this.handlers['langFuse'].span[returnIds['langFuse'].span]
            if (span) {
                span.end({
                    output: {
                        error
                    }
                })
                const langfuseTraceClient = this.handlers['langFuse'].trace[returnIds['langFuse'].trace]
                if (langfuseTraceClient) {
                    langfuseTraceClient.update({
                        output: {
                            error
                        }
                    })
                }
                if (shutdown) {
                    const langfuse: Langfuse = this.handlers['langFuse'].client
                    await langfuse.shutdownAsync()
                    // console.log('Langfuse shutdown completed')
                }
            }
        }

        if (Object.prototype.hasOwnProperty.call(this.handlers, 'lunary')) {
            const chainEventId = returnIds['lunary'].chainEvent
            const monitor = this.handlers['lunary'].client

            if (monitor && chainEventId) {
                await monitor.trackEvent('chain', 'end', {
                    runId: chainEventId,
                    output: error
                })
            }
        }

        if (Object.prototype.hasOwnProperty.call(this.handlers, 'langWatch')) {
            const span: LangWatchSpan | undefined = this.handlers['langWatch'].span[returnIds['langWatch'].span]
            if (span) {
                span.end({
                    error
                })
            }
        }

        if (Object.prototype.hasOwnProperty.call(this.handlers, 'arize')) {
            const chainSpan: Span | undefined = this.handlers['arize'].chainSpan[returnIds['arize'].chainSpan]
            if (chainSpan) {
                chainSpan.setAttribute('error.value', JSON.stringify(error))
                chainSpan.setAttribute('error.mime_type', 'application/json')
                chainSpan.setStatus({ code: SpanStatusCode.ERROR, message: error.toString() })
                chainSpan.end()
            }
        }

        if (Object.prototype.hasOwnProperty.call(this.handlers, 'phoenix')) {
            const chainSpan: Span | undefined = this.handlers['phoenix'].chainSpan[returnIds['phoenix'].chainSpan]
            if (chainSpan) {
                chainSpan.setAttribute('error.value', JSON.stringify(error))
                chainSpan.setAttribute('error.mime_type', 'application/json')
                chainSpan.setStatus({ code: SpanStatusCode.ERROR, message: error.toString() })
                chainSpan.end()
            }
        }

        if (shutdown) {
            // Cleanup this instance when chain ends
            AnalyticHandler.resetInstance(this.chatId)
        }
    }

    async onLLMStart(name: string, input: string | BaseMessageLike[], parentIds: ICommonObject) {
        const returnIds: ICommonObject = {
            langSmith: {},
            langFuse: {},
            lunary: {},
            langWatch: {},
            arize: {},
            phoenix: {}
        }

        if (Object.prototype.hasOwnProperty.call(this.handlers, 'langSmith')) {
            const parentRun: RunTree | undefined = this.handlers['langSmith'].chainRun[parentIds['langSmith'].chainRun]

            if (parentRun) {
                const inputs: any = {}
                if (Array.isArray(input)) {
                    inputs.messages = input
                } else {
                    inputs.prompts = [input]
                }
                const childLLMRun = await parentRun.createChild({
                    name,
                    run_type: 'llm',
                    inputs
                })
                await childLLMRun.postRun()
                this.handlers['langSmith'].llmRun = { [childLLMRun.id]: childLLMRun }
                returnIds['langSmith'].llmRun = childLLMRun.id
            }
        }

        if (Object.prototype.hasOwnProperty.call(this.handlers, 'langFuse')) {
            if (this.langfuseCallbacksActive || this.useNodeLevelLangfuseSpans) {
                if (parentIds?.['langFuse']?.trace) {
                    returnIds['langFuse'].trace = parentIds['langFuse'].trace
                }
            } else {
                const trace: LangfuseTraceClient | undefined = this.handlers['langFuse'].trace[parentIds['langFuse'].trace]
                if (trace) {
                    const generation = trace.generation({
                        name,
                        input: input
                    })
                    this.handlers['langFuse'].generation = { [generation.id]: generation }
                    returnIds['langFuse'].generation = generation.id
                    // console.log(`Langfuse generation created: ${generation.id}`)
                }
            }
        }

        if (Object.prototype.hasOwnProperty.call(this.handlers, 'lunary')) {
            const monitor = this.handlers['lunary'].client
            const chainEventId: string = this.handlers['lunary'].chainEvent[parentIds['lunary'].chainEvent]

            if (monitor && chainEventId) {
                const runId = uuidv4()
                await monitor.trackEvent('llm', 'start', {
                    runId,
                    parentRunId: chainEventId,
                    name,
                    input
                })
                this.handlers['lunary'].llmEvent = { [runId]: runId }
                returnIds['lunary'].llmEvent = runId
            }
        }

        if (Object.prototype.hasOwnProperty.call(this.handlers, 'langWatch')) {
            const trace: LangWatchTrace | undefined = this.handlers['langWatch'].trace[parentIds['langWatch'].trace]
            if (trace) {
                const span = trace.startLLMSpan({
                    name,
                    input: autoconvertTypedValues(input)
                })
                this.handlers['langWatch'].span = { [span.spanId]: span }
                returnIds['langWatch'].span = span.spanId
            }
        }

        if (Object.prototype.hasOwnProperty.call(this.handlers, 'arize')) {
            const tracer: Tracer | undefined = this.handlers['arize'].client
            const rootSpan: Span | undefined = this.handlers['arize'].rootSpan

            const rootSpanContext = rootSpan
                ? opentelemetry.trace.setSpan(opentelemetry.context.active(), rootSpan as Span)
                : opentelemetry.context.active()
            const llmSpan = tracer?.startSpan(name, undefined, rootSpanContext)
            if (llmSpan) {
                llmSpan.setAttribute('openinference.span.kind', 'LLM')
                llmSpan.setAttribute('input.value', JSON.stringify(input))
                llmSpan.setAttribute('input.mime_type', 'application/json')
            }
            const llmSpanId: any = llmSpan?.spanContext().spanId

            this.handlers['arize'].llmSpan = { [llmSpanId]: llmSpan }
            returnIds['arize'].llmSpan = llmSpanId
        }

        if (Object.prototype.hasOwnProperty.call(this.handlers, 'phoenix')) {
            const tracer: Tracer | undefined = this.handlers['phoenix'].client
            const rootSpan: Span | undefined = this.handlers['phoenix'].rootSpan

            const rootSpanContext = rootSpan
                ? opentelemetry.trace.setSpan(opentelemetry.context.active(), rootSpan as Span)
                : opentelemetry.context.active()
            const llmSpan = tracer?.startSpan(name, undefined, rootSpanContext)
            if (llmSpan) {
                llmSpan.setAttribute('openinference.span.kind', 'LLM')
                llmSpan.setAttribute('input.value', JSON.stringify(input))
                llmSpan.setAttribute('input.mime_type', 'application/json')
            }
            const llmSpanId: any = llmSpan?.spanContext().spanId

            this.handlers['phoenix'].llmSpan = { [llmSpanId]: llmSpan }
            returnIds['phoenix'].llmSpan = llmSpanId
        }

        if (Object.prototype.hasOwnProperty.call(this.handlers, 'opik')) {
            const tracer: Tracer | undefined = this.handlers['opik'].client
            const rootSpan: Span | undefined = this.handlers['opik'].rootSpan

            const rootSpanContext = rootSpan
                ? opentelemetry.trace.setSpan(opentelemetry.context.active(), rootSpan as Span)
                : opentelemetry.context.active()
            const llmSpan = tracer?.startSpan(name, undefined, rootSpanContext)
            if (llmSpan) {
                llmSpan.setAttribute('openinference.span.kind', 'LLM')
                llmSpan.setAttribute('input.value', JSON.stringify(input))
                llmSpan.setAttribute('input.mime_type', 'application/json')
            }
            const llmSpanId: any = llmSpan?.spanContext().spanId

            this.handlers['opik'].llmSpan = { [llmSpanId]: llmSpan }
            returnIds['opik'].llmSpan = llmSpanId
        }

        return returnIds
    }

    async onLLMEnd(returnIds: ICommonObject, output: string) {
        if (Object.prototype.hasOwnProperty.call(this.handlers, 'langSmith')) {
            const llmRun: RunTree | undefined = this.handlers['langSmith'].llmRun[returnIds['langSmith'].llmRun]
            if (llmRun) {
                await llmRun.end({
                    outputs: {
                        generations: [output]
                    }
                })
                await llmRun.patchRun()
            }
        }

        if (Object.prototype.hasOwnProperty.call(this.handlers, 'langFuse')) {
            if (!this.langfuseCallbacksActive && !this.useNodeLevelLangfuseSpans) {
                const generationId = returnIds['langFuse'].generation
                const generation: LangfuseGenerationClient | undefined = this.handlers['langFuse'].generation[generationId]
                if (generation) {
                    generation.end({
                        output: output
                    })
                    delete this.handlers['langFuse'].generation[generationId]
                    // console.log(`Langfuse generation ended: ${generation.id}`)
                }
            }
        }

        if (Object.prototype.hasOwnProperty.call(this.handlers, 'lunary')) {
            const llmEventId: string = this.handlers['lunary'].llmEvent[returnIds['lunary'].llmEvent]
            const monitor = this.handlers['lunary'].client

            if (monitor && llmEventId) {
                await monitor.trackEvent('llm', 'end', {
                    runId: llmEventId,
                    output
                })
            }
        }

        if (Object.prototype.hasOwnProperty.call(this.handlers, 'langWatch')) {
            const span: LangWatchSpan | undefined = this.handlers['langWatch'].span[returnIds['langWatch'].span]
            if (span) {
                span.end({
                    output: autoconvertTypedValues(output)
                })
            }
        }

        if (Object.prototype.hasOwnProperty.call(this.handlers, 'arize')) {
            const llmSpan: Span | undefined = this.handlers['arize'].llmSpan[returnIds['arize'].llmSpan]
            if (llmSpan) {
                llmSpan.setAttribute('output.value', JSON.stringify(output))
                llmSpan.setAttribute('output.mime_type', 'application/json')
                llmSpan.setStatus({ code: SpanStatusCode.OK })
                llmSpan.end()
            }
        }

        if (Object.prototype.hasOwnProperty.call(this.handlers, 'phoenix')) {
            const llmSpan: Span | undefined = this.handlers['phoenix'].llmSpan[returnIds['phoenix'].llmSpan]
            if (llmSpan) {
                llmSpan.setAttribute('output.value', JSON.stringify(output))
                llmSpan.setAttribute('output.mime_type', 'application/json')
                llmSpan.setStatus({ code: SpanStatusCode.OK })
                llmSpan.end()
            }
        }

        if (Object.prototype.hasOwnProperty.call(this.handlers, 'opik')) {
            const llmSpan: Span | undefined = this.handlers['opik'].llmSpan[returnIds['opik'].llmSpan]
            if (llmSpan) {
                llmSpan.setAttribute('output.value', JSON.stringify(output))
                llmSpan.setAttribute('output.mime_type', 'application/json')
                llmSpan.setStatus({ code: SpanStatusCode.OK })
                llmSpan.end()
            }
        }
    }

    async onLLMError(returnIds: ICommonObject, error: string | object) {
        if (Object.prototype.hasOwnProperty.call(this.handlers, 'langSmith')) {
            const llmRun: RunTree | undefined = this.handlers['langSmith'].llmRun[returnIds['langSmith'].llmRun]
            if (llmRun) {
                await llmRun.end({
                    error: {
                        error
                    }
                })
                await llmRun.patchRun()
            }
        }

        if (Object.prototype.hasOwnProperty.call(this.handlers, 'langFuse')) {
            if (!this.langfuseCallbacksActive && !this.useNodeLevelLangfuseSpans) {
                const generationId = returnIds['langFuse'].generation
                const generation: LangfuseGenerationClient | undefined = this.handlers['langFuse'].generation[generationId]
                if (generation) {
                    generation.end({
                        output: error
                    })
                    delete this.handlers['langFuse'].generation[generationId]
                    // console.log(`Langfuse generation errored: ${generation.id}`)
                }
            }
        }

        if (Object.prototype.hasOwnProperty.call(this.handlers, 'lunary')) {
            const llmEventId: string = this.handlers['lunary'].llmEvent[returnIds['lunary'].llmEvent]
            const monitor = this.handlers['lunary'].client

            if (monitor && llmEventId) {
                await monitor.trackEvent('llm', 'end', {
                    runId: llmEventId,
                    output: error
                })
            }
        }

        if (Object.prototype.hasOwnProperty.call(this.handlers, 'langWatch')) {
            const span: LangWatchSpan | undefined = this.handlers['langWatch'].span[returnIds['langWatch'].span]
            if (span) {
                span.end({
                    error
                })
            }
        }

        if (Object.prototype.hasOwnProperty.call(this.handlers, 'arize')) {
            const llmSpan: Span | undefined = this.handlers['arize'].llmSpan[returnIds['arize'].llmSpan]
            if (llmSpan) {
                llmSpan.setAttribute('error.value', JSON.stringify(error))
                llmSpan.setAttribute('error.mime_type', 'application/json')
                llmSpan.setStatus({ code: SpanStatusCode.ERROR, message: error.toString() })
                llmSpan.end()
            }
        }

        if (Object.prototype.hasOwnProperty.call(this.handlers, 'phoenix')) {
            const llmSpan: Span | undefined = this.handlers['phoenix'].llmSpan[returnIds['phoenix'].llmSpan]
            if (llmSpan) {
                llmSpan.setAttribute('error.value', JSON.stringify(error))
                llmSpan.setAttribute('error.mime_type', 'application/json')
                llmSpan.setStatus({ code: SpanStatusCode.ERROR, message: error.toString() })
                llmSpan.end()
            }
        }

        if (Object.prototype.hasOwnProperty.call(this.handlers, 'opik')) {
            const llmSpan: Span | undefined = this.handlers['opik'].llmSpan[returnIds['opik'].llmSpan]
            if (llmSpan) {
                llmSpan.setAttribute('error.value', JSON.stringify(error))
                llmSpan.setAttribute('error.mime_type', 'application/json')
                llmSpan.setStatus({ code: SpanStatusCode.ERROR, message: error.toString() })
                llmSpan.end()
            }
        }
    }

    async onToolStart(name: string, input: string | object, parentIds: ICommonObject) {
        const returnIds: ICommonObject = {
            langSmith: {},
            langFuse: {},
            lunary: {},
            langWatch: {},
            arize: {},
            phoenix: {},
            opik: {}
        }

        if (Object.prototype.hasOwnProperty.call(this.handlers, 'langSmith')) {
            const parentRun: RunTree | undefined = this.handlers['langSmith'].chainRun[parentIds['langSmith'].chainRun]
            if (parentRun) {
                const childToolRun = await parentRun.createChild({
                    name,
                    run_type: 'tool',
                    inputs: {
                        input
                    }
                })
                await childToolRun.postRun()
                this.handlers['langSmith'].toolRun = { [childToolRun.id]: childToolRun }
                returnIds['langSmith'].toolRun = childToolRun.id
            }
        }

        if (Object.prototype.hasOwnProperty.call(this.handlers, 'langFuse')) {
            const trace: LangfuseTraceClient | undefined = this.handlers['langFuse'].trace[parentIds['langFuse'].trace]
            if (trace) {
                const toolSpan = trace.span({
                    name,
                    input
                })
                this.handlers['langFuse'].toolSpan = { [toolSpan.id]: toolSpan }
                returnIds['langFuse'].toolSpan = toolSpan.id
                // console.log(`Langfuse tool span created: ${toolSpan.id}`)
            }
        }

        if (Object.prototype.hasOwnProperty.call(this.handlers, 'lunary')) {
            const monitor = this.handlers['lunary'].client
            const chainEventId: string = this.handlers['lunary'].chainEvent[parentIds['lunary'].chainEvent]

            if (monitor && chainEventId) {
                const runId = uuidv4()
                await monitor.trackEvent('tool', 'start', {
                    runId,
                    parentRunId: chainEventId,
                    name,
                    input
                })
                this.handlers['lunary'].toolEvent = { [runId]: runId }
                returnIds['lunary'].toolEvent = runId
            }
        }

        if (Object.prototype.hasOwnProperty.call(this.handlers, 'langWatch')) {
            const trace: LangWatchTrace | undefined = this.handlers['langWatch'].trace[parentIds['langWatch'].trace]
            if (trace) {
                const span = trace.startSpan({
                    name,
                    type: 'tool',
                    input: autoconvertTypedValues(input)
                })
                this.handlers['langWatch'].span = { [span.spanId]: span }
                returnIds['langWatch'].span = span.spanId
            }
        }

        if (Object.prototype.hasOwnProperty.call(this.handlers, 'arize')) {
            const tracer: Tracer | undefined = this.handlers['arize'].client
            const rootSpan: Span | undefined = this.handlers['arize'].rootSpan

            const rootSpanContext = rootSpan
                ? opentelemetry.trace.setSpan(opentelemetry.context.active(), rootSpan as Span)
                : opentelemetry.context.active()
            const toolSpan = tracer?.startSpan(name, undefined, rootSpanContext)
            if (toolSpan) {
                toolSpan.setAttribute('openinference.span.kind', 'TOOL')
                toolSpan.setAttribute('input.value', JSON.stringify(input))
                toolSpan.setAttribute('input.mime_type', 'application/json')
            }
            const toolSpanId: any = toolSpan?.spanContext().spanId

            this.handlers['arize'].toolSpan = { [toolSpanId]: toolSpan }
            returnIds['arize'].toolSpan = toolSpanId
        }

        if (Object.prototype.hasOwnProperty.call(this.handlers, 'phoenix')) {
            const tracer: Tracer | undefined = this.handlers['phoenix'].client
            const rootSpan: Span | undefined = this.handlers['phoenix'].rootSpan

            const rootSpanContext = rootSpan
                ? opentelemetry.trace.setSpan(opentelemetry.context.active(), rootSpan as Span)
                : opentelemetry.context.active()
            const toolSpan = tracer?.startSpan(name, undefined, rootSpanContext)
            if (toolSpan) {
                toolSpan.setAttribute('openinference.span.kind', 'TOOL')
                toolSpan.setAttribute('input.value', JSON.stringify(input))
                toolSpan.setAttribute('input.mime_type', 'application/json')
            }
            const toolSpanId: any = toolSpan?.spanContext().spanId

            this.handlers['phoenix'].toolSpan = { [toolSpanId]: toolSpan }
            returnIds['phoenix'].toolSpan = toolSpanId
        }

        if (Object.prototype.hasOwnProperty.call(this.handlers, 'opik')) {
            const tracer: Tracer | undefined = this.handlers['opik'].client
            const rootSpan: Span | undefined = this.handlers['opik'].rootSpan

            const rootSpanContext = rootSpan
                ? opentelemetry.trace.setSpan(opentelemetry.context.active(), rootSpan as Span)
                : opentelemetry.context.active()
            const toolSpan = tracer?.startSpan(name, undefined, rootSpanContext)
            if (toolSpan) {
                toolSpan.setAttribute('openinference.span.kind', 'TOOL')
                toolSpan.setAttribute('input.value', JSON.stringify(input))
                toolSpan.setAttribute('input.mime_type', 'application/json')
            }
            const toolSpanId: any = toolSpan?.spanContext().spanId

            this.handlers['opik'].toolSpan = { [toolSpanId]: toolSpan }
            returnIds['opik'].toolSpan = toolSpanId
        }

        return returnIds
    }

    async onToolEnd(returnIds: ICommonObject, output: string | object) {
        if (Object.prototype.hasOwnProperty.call(this.handlers, 'langSmith')) {
            const toolRun: RunTree | undefined = this.handlers['langSmith'].toolRun[returnIds['langSmith'].toolRun]
            if (toolRun) {
                await toolRun.end({
                    outputs: {
                        output
                    }
                })
                await toolRun.patchRun()
            }
        }

        if (Object.prototype.hasOwnProperty.call(this.handlers, 'langFuse')) {
            const toolSpan: LangfuseSpanClient | undefined = this.handlers['langFuse'].toolSpan[returnIds['langFuse'].toolSpan]
            if (toolSpan) {
                toolSpan.end({
                    output
                })
                // console.log(`Langfuse tool span ended: ${toolSpan.id}`)
            }
        }

        if (Object.prototype.hasOwnProperty.call(this.handlers, 'lunary')) {
            const toolEventId: string = this.handlers['lunary'].toolEvent[returnIds['lunary'].toolEvent]
            const monitor = this.handlers['lunary'].client

            if (monitor && toolEventId) {
                await monitor.trackEvent('tool', 'end', {
                    runId: toolEventId,
                    output
                })
            }
        }

        if (Object.prototype.hasOwnProperty.call(this.handlers, 'langWatch')) {
            const span: LangWatchSpan | undefined = this.handlers['langWatch'].span[returnIds['langWatch'].span]
            if (span) {
                span.end({
                    output: autoconvertTypedValues(output)
                })
            }
        }

        if (Object.prototype.hasOwnProperty.call(this.handlers, 'arize')) {
            const toolSpan: Span | undefined = this.handlers['arize'].toolSpan[returnIds['arize'].toolSpan]
            if (toolSpan) {
                toolSpan.setAttribute('output.value', JSON.stringify(output))
                toolSpan.setAttribute('output.mime_type', 'application/json')
                toolSpan.setStatus({ code: SpanStatusCode.OK })
                toolSpan.end()
            }
        }

        if (Object.prototype.hasOwnProperty.call(this.handlers, 'phoenix')) {
            const toolSpan: Span | undefined = this.handlers['phoenix'].toolSpan[returnIds['phoenix'].toolSpan]
            if (toolSpan) {
                toolSpan.setAttribute('output.value', JSON.stringify(output))
                toolSpan.setAttribute('output.mime_type', 'application/json')
                toolSpan.setStatus({ code: SpanStatusCode.OK })
                toolSpan.end()
            }
        }

        if (Object.prototype.hasOwnProperty.call(this.handlers, 'opik')) {
            const toolSpan: Span | undefined = this.handlers['opik'].toolSpan[returnIds['opik'].toolSpan]
            if (toolSpan) {
                toolSpan.setAttribute('output.value', JSON.stringify(output))
                toolSpan.setAttribute('output.mime_type', 'application/json')
                toolSpan.setStatus({ code: SpanStatusCode.OK })
                toolSpan.end()
            }
        }
    }

    async onToolError(returnIds: ICommonObject, error: string | object) {
        if (Object.prototype.hasOwnProperty.call(this.handlers, 'langSmith')) {
            const toolRun: RunTree | undefined = this.handlers['langSmith'].toolRun[returnIds['langSmith'].toolRun]
            if (toolRun) {
                await toolRun.end({
                    error: {
                        error
                    }
                })
                await toolRun.patchRun()
            }
        }

        if (Object.prototype.hasOwnProperty.call(this.handlers, 'langFuse')) {
            const toolSpan: LangfuseSpanClient | undefined = this.handlers['langFuse'].toolSpan[returnIds['langFuse'].toolSpan]
            if (toolSpan) {
                toolSpan.end({
                    output: error
                })
                // console.log(`Langfuse tool span errored: ${toolSpan.id}`)
            }
        }

        if (Object.prototype.hasOwnProperty.call(this.handlers, 'lunary')) {
            const toolEventId: string = this.handlers['lunary'].llmEvent[returnIds['lunary'].toolEvent]
            const monitor = this.handlers['lunary'].client

            if (monitor && toolEventId) {
                await monitor.trackEvent('tool', 'end', {
                    runId: toolEventId,
                    output: error
                })
            }
        }

        if (Object.prototype.hasOwnProperty.call(this.handlers, 'langWatch')) {
            const span: LangWatchSpan | undefined = this.handlers['langWatch'].span[returnIds['langWatch'].span]
            if (span) {
                span.end({
                    error
                })
            }
        }

        if (Object.prototype.hasOwnProperty.call(this.handlers, 'arize')) {
            const toolSpan: Span | undefined = this.handlers['arize'].toolSpan[returnIds['arize'].toolSpan]
            if (toolSpan) {
                toolSpan.setAttribute('error.value', JSON.stringify(error))
                toolSpan.setAttribute('error.mime_type', 'application/json')
                toolSpan.setStatus({ code: SpanStatusCode.ERROR, message: error.toString() })
                toolSpan.end()
            }
        }

        if (Object.prototype.hasOwnProperty.call(this.handlers, 'phoenix')) {
            const toolSpan: Span | undefined = this.handlers['phoenix'].toolSpan[returnIds['phoenix'].toolSpan]
            if (toolSpan) {
                toolSpan.setAttribute('error.value', JSON.stringify(error))
                toolSpan.setAttribute('error.mime_type', 'application/json')
                toolSpan.setStatus({ code: SpanStatusCode.ERROR, message: error.toString() })
                toolSpan.end()
            }
        }

        if (Object.prototype.hasOwnProperty.call(this.handlers, 'opik')) {
            const toolSpan: Span | undefined = this.handlers['opik'].toolSpan[returnIds['opik'].toolSpan]
            if (toolSpan) {
                toolSpan.setAttribute('error.value', JSON.stringify(error))
                toolSpan.setAttribute('error.mime_type', 'application/json')
                toolSpan.setStatus({ code: SpanStatusCode.ERROR, message: error.toString() })
                toolSpan.end()
            }
        }
    }

    /**
     * Safely serialize a value for Langfuse trace payload
     * Handles circular references and unserializable values
     */
    safeSerializeForTrace(value: any): any {
        if (value === undefined || value === null) return value
        if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') return value
        try {
            return JSON.parse(JSON.stringify(value))
        } catch (error) {
            console.warn(`Failed to serialize payload for Langfuse trace: ${error instanceof Error ? error.message : String(error)}`)
            return '[Unserializable]'
        }
    }

    /**
     * Create a Langfuse tool span for tracing tool execution
     * @param parentSpan - Parent Langfuse span to attach this tool span to
     * @param toolName - Name of the tool being executed
     * @param args - Tool arguments/input
     * @param metadata - Additional metadata to attach to the span
     * @returns LangfuseSpanClient if successful, undefined otherwise
     */
    createToolSpan(
        parentSpan: LangfuseSpanClient | undefined,
        toolName: string,
        args: any,
        metadata?: ICommonObject
    ): LangfuseSpanClient | undefined {
        if (!parentSpan) return undefined
        try {
            return parentSpan.span({
                name: `Tool:${toolName}`,
                metadata: {
                    toolName,
                    status: 'IN_PROGRESS',
                    ...(metadata ?? {})
                },
                input: {
                    args: this.safeSerializeForTrace(args)
                }
            })
        } catch (error) {
            console.warn(`Failed to create Langfuse tool span for ${toolName}: ${error instanceof Error ? error.message : String(error)}`)
            return undefined
        }
    }

    /**
     * Finalize a Langfuse tool span with status and output
     * @param span - The Langfuse span to finalize
     * @param status - Final status ('FINISHED' or 'ERROR')
     * @param payload - Output data to attach to the span
     */
    finishToolSpan(span: LangfuseSpanClient | undefined, status: 'FINISHED' | 'ERROR', payload: ICommonObject): void {
        if (!span) return
        try {
            span.update({
                metadata: {
                    status
                }
            })
            span.end({ output: payload })
        } catch (error) {
            console.warn(`Failed to finalize Langfuse tool span: ${error instanceof Error ? error.message : String(error)}`)
        }
    }
}

/**
 * Custom callback handler for streaming detailed intermediate information
 * during agent execution, specifically tool invocation inputs and outputs.
 */
export class CustomStreamingHandler extends BaseCallbackHandler {
    name = 'custom_streaming_handler'

    private sseStreamer: IServerSideEventStreamer
    private chatId: string

    constructor(sseStreamer: IServerSideEventStreamer, chatId: string) {
        super()
        this.sseStreamer = sseStreamer
        this.chatId = chatId
    }

    /**
     * Handle the start of a tool invocation
     */
    async handleToolStart(tool: Serialized, input: string, runId: string, parentRunId?: string): Promise<void> {
        if (!this.sseStreamer) return

        const toolName = typeof tool === 'object' && tool.name ? tool.name : 'unknown-tool'
        const toolInput = typeof input === 'string' ? input : JSON.stringify(input, null, 2)

        // Stream the tool invocation details using the agent_trace event type for consistency
        this.sseStreamer.streamCustomEvent(this.chatId, 'agent_trace', {
            step: 'tool_start',
            name: toolName,
            input: toolInput,
            runId,
            parentRunId: parentRunId || null
        })
    }

    /**
     * Handle the end of a tool invocation
     */
    async handleToolEnd(output: string | object, runId: string, parentRunId?: string): Promise<void> {
        if (!this.sseStreamer) return

        const toolOutput = typeof output === 'string' ? output : JSON.stringify(output, null, 2)

        // Stream the tool output details using the agent_trace event type for consistency
        this.sseStreamer.streamCustomEvent(this.chatId, 'agent_trace', {
            step: 'tool_end',
            output: toolOutput,
            runId,
            parentRunId: parentRunId || null
        })
    }

    /**
     * Handle tool errors
     */
    async handleToolError(error: Error, runId: string, parentRunId?: string): Promise<void> {
        if (!this.sseStreamer) return

        // Stream the tool error details using the agent_trace event type for consistency
        this.sseStreamer.streamCustomEvent(this.chatId, 'agent_trace', {
            step: 'tool_error',
            error: error.message,
            runId,
            parentRunId: parentRunId || null
        })
    }

    /**
     * Handle agent actions
     */
    async handleAgentAction(action: AgentAction, runId: string, parentRunId?: string): Promise<void> {
        if (!this.sseStreamer) return

        // Stream the agent action details using the agent_trace event type for consistency
        this.sseStreamer.streamCustomEvent(this.chatId, 'agent_trace', {
            step: 'agent_action',
            action: JSON.stringify(action),
            runId,
            parentRunId: parentRunId || null
        })
    }
}
