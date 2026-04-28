import { SpanStatusCode } from '@opentelemetry/api'
import { NodeTracerProvider } from '@opentelemetry/sdk-trace-node'
import { InMemorySpanExporter, SimpleSpanProcessor, ReadableSpan } from '@opentelemetry/sdk-trace-base'
import { Serialized } from '@langchain/core/load/serializable'
import { OtelLangChainCallbackHandler } from './OtelLangChainCallbackHandler'
import { OtelTracerProviderPool } from './OtelTracerProviderPool'
import { getCallbackHandler } from './OtelAnalyticsProvider'

// ---------------------------------------------------------------------------
// Mock createTracerProvider so tests don't create real exporters / network connections.
// Instead, each call returns a real NodeTracerProvider wired to an InMemorySpanExporter.
// ---------------------------------------------------------------------------

let sharedExporter: InMemorySpanExporter

jest.mock('../../../src/analyticsHandlers/otel/OtelDestinationFactory', () => ({
    createTracerProvider: jest.fn(() => {
        sharedExporter = new InMemorySpanExporter()
        const provider = new NodeTracerProvider()
        provider.addSpanProcessor(new SimpleSpanProcessor(sharedExporter))
        return provider
    })
}))

function serialized(idPath: string[]): Serialized {
    return { lc: 1, id: idPath, type: 'not_implemented' } as Serialized
}

function getSpans(): ReadableSpan[] {
    return sharedExporter.getFinishedSpans()
}

// ---------------------------------------------------------------------------
// Integration test: prediction with OTEL enabled exports spans
// ---------------------------------------------------------------------------

describe('Integration: OTEL-enabled prediction exports spans', () => {
    beforeEach(() => {
        OtelTracerProviderPool.resetInstance()
        jest.clearAllMocks()
        jest.spyOn(console, 'info').mockImplementation(() => {})
        jest.spyOn(console, 'warn').mockImplementation(() => {})
    })

    afterEach(async () => {
        const pool = OtelTracerProviderPool.getInstance()
        await pool.shutdownAll()
        OtelTracerProviderPool.resetInstance()
        jest.restoreAllMocks()
    })

    it('exports spans for a full chain → LLM → tool prediction lifecycle', async () => {
        const credentialData = {
            otelEndpoint: 'https://otlp.example.com/v1/traces',
            otelHeaderKey: 'api-key',
            otelHeaderValue: 'test-secret'
        }
        const otelConfig = {
            status: true,
            spanAttributes: { team: 'platform' }
        }

        const handler = await getCallbackHandler('flow-integration-1', otelConfig, credentialData, {
            chatId: 'chat-int-1'
        })

        expect(handler).toBeInstanceOf(OtelLangChainCallbackHandler)

        const chainRunId = 'chain-run-1'
        const llmRunId = 'llm-run-1'
        const toolRunId = 'tool-run-1'

        await handler.handleChainStart(serialized(['langchain', 'chains', 'RetrievalQA']), { question: 'What is Flowise?' }, chainRunId)

        await handler.handleLLMStart(serialized(['langchain', 'llms', 'OpenAI']), ['What is Flowise?'], llmRunId, chainRunId, {
            invocation_params: { model: 'gpt-4', temperature: 0.7 }
        })

        await handler.handleLLMEnd(
            {
                generations: [[{ text: 'Flowise is a drag-and-drop UI for LangChain.' }]],
                llmOutput: {
                    tokenUsage: { promptTokens: 10, completionTokens: 20, totalTokens: 30 },
                    model: 'gpt-4'
                }
            },
            llmRunId
        )

        await handler.handleToolStart(
            { lc: 1, id: [], type: 'not_implemented', name: 'search' } as unknown as Serialized,
            'Flowise documentation',
            toolRunId,
            chainRunId
        )

        await handler.handleToolEnd('Found 3 results about Flowise', toolRunId)

        await handler.handleChainEnd({ answer: 'Flowise is a drag-and-drop UI for LangChain.' }, chainRunId)

        const spans = getSpans()
        expect(spans.length).toBe(3) // root chain + LLM + tool

        const rootSpan = spans.find((s) => s.name === 'RetrievalQA')!
        expect(rootSpan).toBeDefined()
        expect(rootSpan.attributes['openinference.span.kind']).toBe('CHAIN')
        expect(rootSpan.attributes['team']).toBe('platform')
        expect(rootSpan.attributes['session.id']).toBe('chat-int-1')
        expect(rootSpan.attributes['request.type']).toBe('chatflow')
        expect(rootSpan.status.code).toBe(SpanStatusCode.OK)

        const llmSpan = spans.find((s) => s.name === 'gpt-4')!
        expect(llmSpan).toBeDefined()
        expect(llmSpan.attributes['openinference.span.kind']).toBe('LLM')
        expect(llmSpan.attributes['llm.model_name']).toBe('gpt-4')
        expect(llmSpan.attributes['llm.token_count.prompt']).toBe(10)
        expect(llmSpan.attributes['llm.token_count.completion']).toBe(20)
        expect(llmSpan.attributes['llm.token_count.total']).toBe(30)
        expect(llmSpan.attributes['llm.latency_ms']).toBeDefined()
        expect(llmSpan.parentSpanId).toBe(rootSpan.spanContext().spanId)

        const toolSpan = spans.find((s) => s.name === 'search')!
        expect(toolSpan).toBeDefined()
        expect(toolSpan.attributes['openinference.span.kind']).toBe('TOOL')
        expect(toolSpan.attributes['tool.name']).toBe('search')
        expect(toolSpan.attributes['tool.output']).toBe('Found 3 results about Flowise')
        expect(toolSpan.parentSpanId).toBe(rootSpan.spanContext().spanId)
    })

    it('pool reuses the TracerProvider for the same chatflowId across multiple predictions', async () => {
        const credentialData = { otelEndpoint: 'https://otlp.example.com' }

        const handler1 = await getCallbackHandler('flow-reuse', {}, credentialData, {})
        const handler2 = await getCallbackHandler('flow-reuse', {}, credentialData, {})

        const pool = OtelTracerProviderPool.getInstance()
        expect(pool.size).toBe(1)

        expect(handler1).toBeInstanceOf(OtelLangChainCallbackHandler)
        expect(handler2).toBeInstanceOf(OtelLangChainCallbackHandler)
    })
})

// ---------------------------------------------------------------------------
// Integration test: prediction with OTEL disabled produces zero spans
// ---------------------------------------------------------------------------

describe('Integration: OTEL-disabled prediction produces zero spans', () => {
    beforeEach(() => {
        OtelTracerProviderPool.resetInstance()
        jest.clearAllMocks()
        jest.spyOn(console, 'info').mockImplementation(() => {})
        jest.spyOn(console, 'warn').mockImplementation(() => {})
    })

    afterEach(async () => {
        await OtelTracerProviderPool.getInstance().shutdownAll()
        OtelTracerProviderPool.resetInstance()
        jest.restoreAllMocks()
    })

    it('does not create a handler or spans when status is false', () => {
        const analytic = {
            openTelemetry: {
                status: false,
                credentialId: 'cred-123'
            }
        }

        const providerStatus = analytic.openTelemetry.status as boolean
        expect(providerStatus).toBe(false)
        // additionalCallbacks() skips disabled providers — no handler is created
        // No pool entry, no spans
        expect(OtelTracerProviderPool.getInstance().size).toBe(0)
    })

    it('does not create pool entries or spans when OTEL is absent from analytic config', () => {
        const analytic = {
            langSmith: { status: true, projectName: 'test', credentialId: 'ls-cred' }
        }

        expect(Object.prototype.hasOwnProperty.call(analytic, 'openTelemetry')).toBe(false)
        expect(OtelTracerProviderPool.getInstance().size).toBe(0)
    })
})

// ---------------------------------------------------------------------------
// Integration test: existing analytics providers still function
//         when OTEL is also enabled
// ---------------------------------------------------------------------------

describe('Integration: OTEL coexists with other analytics providers', () => {
    beforeEach(() => {
        OtelTracerProviderPool.resetInstance()
        jest.clearAllMocks()
        jest.spyOn(console, 'info').mockImplementation(() => {})
        jest.spyOn(console, 'warn').mockImplementation(() => {})
    })

    afterEach(async () => {
        await OtelTracerProviderPool.getInstance().shutdownAll()
        OtelTracerProviderPool.resetInstance()
        jest.restoreAllMocks()
    })

    it('OTEL handler is independent and does not interfere with other provider config', async () => {
        const analytic = {
            langSmith: {
                status: true,
                projectName: 'my-project',
                credentialId: 'ls-cred-1'
            },
            langFuse: {
                status: true,
                credentialId: 'lf-cred-1'
            },
            openTelemetry: {
                status: true,
                credentialId: 'otel-cred-1',
                spanAttributes: { env: 'test' }
            }
        }

        expect(analytic.langSmith.status).toBe(true)
        expect(analytic.langFuse.status).toBe(true)
        expect(analytic.openTelemetry.status).toBe(true)

        const credentialData = { otelEndpoint: 'https://otlp.example.com' }
        const handler = await getCallbackHandler('flow-coexist', analytic.openTelemetry, credentialData, {
            chatId: 'chat-coexist'
        })

        expect(handler).toBeInstanceOf(OtelLangChainCallbackHandler)
        expect(handler.name).toBe('otel_langchain_handler')

        // The OTEL handler is independent — other providers would each get their
        // own callback handler via additionalCallbacks() without interference.
        expect(OtelTracerProviderPool.getInstance().size).toBe(1)
    })

    it('exports retrieval spans alongside other span types in a RAG prediction', async () => {
        const credentialData = {
            otelEndpoint: 'https://otlp.example.com/v1/traces',
            otelHeaderKey: 'api-key',
            otelHeaderValue: 'test-secret'
        }

        const handler = await getCallbackHandler('flow-retrieval-1', {}, credentialData, { chatId: 'chat-rag-1' })

        const chainRunId = 'rag-chain-1'
        const retrieverRunId = 'retriever-run-1'
        const llmRunId = 'rag-llm-1'

        await handler.handleChainStart(serialized(['langchain', 'chains', 'RetrievalQA']), { question: 'What is Flowise?' }, chainRunId)

        await handler.handleRetrieverStart(
            serialized(['langchain', 'retrievers', 'VectorStoreRetriever']),
            'What is Flowise?',
            retrieverRunId,
            chainRunId
        )
        await handler.handleRetrieverEnd(
            [
                { pageContent: 'Flowise is a drag-and-drop tool.', metadata: { source: 'docs.pdf' }, id: 'd1' },
                { pageContent: 'Flowise uses LangChain under the hood.', metadata: { source: 'faq.md' }, id: 'd2' }
            ],
            retrieverRunId
        )

        await handler.handleLLMStart(serialized(['langchain', 'llms', 'ChatOpenAI']), ['synthesize'], llmRunId, chainRunId, {
            invocation_params: { model: 'gpt-4' }
        })
        await handler.handleLLMEnd({ generations: [[{ text: 'Flowise is a drag-and-drop UI.' }]], llmOutput: { model: 'gpt-4' } }, llmRunId)

        await handler.handleChainEnd({ answer: 'Flowise is a drag-and-drop UI.' }, chainRunId)

        const spans = getSpans()
        expect(spans.length).toBe(3) // chain + retriever + LLM

        const rootSpan = spans.find((s) => s.name === 'RetrievalQA')!
        const retrieverSpan = spans.find((s) => s.attributes['openinference.span.kind'] === 'RETRIEVER')!
        const llmSpan = spans.find((s) => s.attributes['openinference.span.kind'] === 'LLM')!

        expect(retrieverSpan).toBeDefined()
        expect(retrieverSpan.name).toBe('retrieval.VectorStoreRetriever')
        expect(retrieverSpan.attributes['retrieval.source']).toBe('VectorStoreRetriever')
        expect(retrieverSpan.attributes['retrieval.query']).toBe('What is Flowise?')
        expect(retrieverSpan.attributes['retrieval.num_results']).toBe(2)
        expect(retrieverSpan.attributes['retrieval.latency_ms']).toBeDefined()
        expect(retrieverSpan.parentSpanId).toBe(rootSpan.spanContext().spanId)

        expect(llmSpan.parentSpanId).toBe(rootSpan.spanContext().spanId)
    })

    it('multiple chatflows with different OTEL configs maintain separate pool entries', async () => {
        const credA = { otelEndpoint: 'https://newrelic.example.com', otelServiceName: 'service-a' }
        const credB = { otelEndpoint: 'https://datadog.example.com', otelServiceName: 'service-b' }

        const handlerA = await getCallbackHandler('flow-a', {}, credA, {})
        const handlerB = await getCallbackHandler('flow-b', {}, credB, {})

        expect(handlerA).toBeInstanceOf(OtelLangChainCallbackHandler)
        expect(handlerB).toBeInstanceOf(OtelLangChainCallbackHandler)

        const pool = OtelTracerProviderPool.getInstance()
        expect(pool.size).toBe(2)

        // Each chatflow has its own TracerProvider
        expect(pool.getProvider('flow-a')).toBeDefined()
        expect(pool.getProvider('flow-b')).toBeDefined()
        expect(pool.getProvider('flow-a')).not.toBe(pool.getProvider('flow-b'))
    })
})
