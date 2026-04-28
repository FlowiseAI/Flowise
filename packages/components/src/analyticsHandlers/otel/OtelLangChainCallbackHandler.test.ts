import { SpanStatusCode } from '@opentelemetry/api'
import { NodeTracerProvider } from '@opentelemetry/sdk-trace-node'
import { InMemorySpanExporter, SimpleSpanProcessor, ReadableSpan } from '@opentelemetry/sdk-trace-base'
import { Serialized } from '@langchain/core/load/serializable'
import { OtelLangChainCallbackHandler, RESERVED_ATTRIBUTE_KEYS, isReservedAttributeKey } from './OtelLangChainCallbackHandler'

function serialized(idPath: string[], extra?: Record<string, any>): Serialized {
    return { lc: 1, id: idPath, type: 'not_implemented', ...extra } as Serialized
}

function serializedNamed(name: string): Serialized {
    return { lc: 1, id: [], type: 'not_implemented', name } as unknown as Serialized
}

let exporter: InMemorySpanExporter
let provider: NodeTracerProvider

function setup(opts: { spanAttributes?: Record<string, string>; chatId?: string; overrideConfig?: any } = {}) {
    exporter = new InMemorySpanExporter()
    provider = new NodeTracerProvider()
    provider.addSpanProcessor(new SimpleSpanProcessor(exporter))
    const tracer = provider.getTracer('test')
    const handler = new OtelLangChainCallbackHandler({
        tracer,
        chatflowId: 'flow-123',
        chatId: opts.chatId,
        spanAttributes: opts.spanAttributes,
        overrideConfig: opts.overrideConfig
    })
    return { handler, tracer }
}

function getSpans(): ReadableSpan[] {
    return exporter.getFinishedSpans()
}

afterEach(async () => {
    if (provider) await provider.shutdown()
})

// ---------------------------------------------------------------------------
// handleChainStart + handleChainEnd
// ---------------------------------------------------------------------------

describe('handleChainStart + handleChainEnd', () => {
    it('creates and ends a span with correct chain type name and CHAIN kind', async () => {
        const { handler } = setup()

        await handler.handleChainStart(serialized(['langchain', 'chains', 'ConversationChain']), { input: 'hello' }, 'run-1')
        await handler.handleChainEnd({ output: 'hi there' }, 'run-1')

        const spans = getSpans()
        expect(spans).toHaveLength(1)

        const span = spans[0]
        expect(span.name).toBe('ConversationChain')
        expect(span.attributes['openinference.span.kind']).toBe('CHAIN')
        expect(span.attributes['flowise.chatflow_id']).toBe('flow-123')
        expect(span.attributes['input.value']).toBe(JSON.stringify({ input: 'hello' }))
        expect(span.attributes['output.value']).toBe(JSON.stringify({ output: 'hi there' }))
        expect(span.status.code).toBe(SpanStatusCode.OK)
    })
})

// ---------------------------------------------------------------------------
// handleChainError records exception with ERROR status
// ---------------------------------------------------------------------------

describe('handleChainError', () => {
    it('records exception with exception.type, exception.message, recordException(), and ERROR status', async () => {
        const { handler } = setup()

        await handler.handleChainStart(serialized(['langchain', 'chains', 'LLMChain']), { input: 'test' }, 'run-err')

        const error = new TypeError('Something broke')
        await handler.handleChainError(error, 'run-err')

        const spans = getSpans()
        expect(spans).toHaveLength(1)

        const span = spans[0]
        expect(span.attributes['exception.type']).toBe('TypeError')
        expect(span.attributes['exception.message']).toBe('Something broke')
        expect(span.status.code).toBe(SpanStatusCode.ERROR)
        expect(span.status.message).toBe('Something broke')

        const events = span.events.filter((e) => e.name === 'exception')
        expect(events.length).toBeGreaterThanOrEqual(1)
    })
})

// ---------------------------------------------------------------------------
// handleLLMStart + handleLLMEnd
// ---------------------------------------------------------------------------

describe('handleLLMStart + handleLLMEnd', () => {
    it('creates span with correct LLM attributes and token counts', async () => {
        const { handler } = setup()

        // Root chain to serve as parent
        await handler.handleChainStart(serialized(['langchain', 'chains', 'Root']), { input: 'hi' }, 'root-run')

        await handler.handleLLMStart(serialized(['langchain', 'llms', 'ChatOpenAI']), ['What is 1+1?'], 'llm-run', 'root-run', {
            invocation_params: { model: 'gpt-4', temperature: 0.7, max_tokens: 256 }
        })

        await handler.handleLLMEnd(
            {
                generations: [[{ text: 'The answer is 2' }]],
                llmOutput: {
                    tokenUsage: { promptTokens: 10, completionTokens: 5, totalTokens: 15 }
                }
            },
            'llm-run'
        )

        await handler.handleChainEnd({ output: 'done' }, 'root-run')

        const spans = getSpans()
        const llmSpan = spans.find((s) => s.attributes['openinference.span.kind'] === 'LLM')
        expect(llmSpan).toBeDefined()

        expect(llmSpan!.attributes['llm.system']).toBe('ChatOpenAI')
        expect(llmSpan!.attributes['llm.provider']).toBe('ChatOpenAI')
        expect(llmSpan!.attributes['llm.model_name']).toBe('gpt-4')
        expect(llmSpan!.attributes['llm.model']).toBe('gpt-4')
        expect(llmSpan!.attributes['llm.token_count.prompt']).toBe(10)
        expect(llmSpan!.attributes['llm.prompt_tokens']).toBe(10)
        expect(llmSpan!.attributes['llm.token_count.completion']).toBe(5)
        expect(llmSpan!.attributes['llm.completion_tokens']).toBe(5)
        expect(llmSpan!.attributes['llm.latency_ms']).toBeDefined()
        expect(typeof llmSpan!.attributes['llm.latency_ms']).toBe('number')
    })
})

// ---------------------------------------------------------------------------
// handleToolStart + handleToolEnd
// ---------------------------------------------------------------------------

describe('handleToolStart + handleToolEnd', () => {
    it('creates span with tool.name, tool.input, tool.output, tool.latency_ms', async () => {
        const { handler } = setup()

        await handler.handleChainStart(serialized(['langchain', 'chains', 'Agent']), { input: 'search' }, 'root-run')

        await handler.handleToolStart(serializedNamed('calculator'), '2+2', 'tool-run', 'root-run')

        await handler.handleToolEnd('4', 'tool-run')
        await handler.handleChainEnd({ output: 'done' }, 'root-run')

        const spans = getSpans()
        const toolSpan = spans.find((s) => s.attributes['openinference.span.kind'] === 'TOOL')
        expect(toolSpan).toBeDefined()

        expect(toolSpan!.attributes['tool.name']).toBe('calculator')
        expect(toolSpan!.attributes['tool.input']).toBe('2+2')
        expect(toolSpan!.attributes['tool.output']).toBe('4')
        expect(toolSpan!.attributes['tool.latency_ms']).toBeDefined()
        expect(typeof toolSpan!.attributes['tool.latency_ms']).toBe('number')
    })
})

// ---------------------------------------------------------------------------
// Parent-child span linking via parentRunId
// ---------------------------------------------------------------------------

describe('parent-child span linking', () => {
    it('links child span to parent via parentRunId / contextMap', async () => {
        const { handler } = setup()

        await handler.handleChainStart(serialized(['langchain', 'chains', 'Root']), { input: 'hi' }, 'parent-run')

        await handler.handleChainStart(serialized(['langchain', 'chains', 'Child']), { input: 'sub' }, 'child-run', 'parent-run')

        await handler.handleChainEnd({ output: 'sub-out' }, 'child-run')
        await handler.handleChainEnd({ output: 'out' }, 'parent-run')

        const spans = getSpans()
        expect(spans).toHaveLength(2)

        const parentSpan = spans.find((s) => s.name === 'Root')!
        const childSpan = spans.find((s) => s.name === 'Child')!

        expect(childSpan.parentSpanId).toBe(parentSpan.spanContext().spanId)
    })
})

// ---------------------------------------------------------------------------
// Nested chain → LLM → tool hierarchy
// ---------------------------------------------------------------------------

describe('nested chain → LLM → tool hierarchy', () => {
    it('produces correct span tree with three levels', async () => {
        const { handler } = setup()

        await handler.handleChainStart(serialized(['langchain', 'chains', 'RootChain']), { input: 'start' }, 'chain-run')

        await handler.handleLLMStart(serialized(['langchain', 'llms', 'OpenAI']), ['prompt'], 'llm-run', 'chain-run', {
            invocation_params: { model: 'gpt-3.5-turbo' }
        })

        await handler.handleLLMEnd({ generations: [[{ text: 'result' }]], llmOutput: {} }, 'llm-run')

        await handler.handleToolStart(serializedNamed('search'), 'query', 'tool-run', 'chain-run')
        await handler.handleToolEnd('found it', 'tool-run')

        await handler.handleChainEnd({ output: 'done' }, 'chain-run')

        const spans = getSpans()
        expect(spans).toHaveLength(3)

        const chainSpan = spans.find((s) => s.name === 'RootChain')!
        const llmSpan = spans.find((s) => s.attributes['openinference.span.kind'] === 'LLM')!
        const toolSpan = spans.find((s) => s.attributes['openinference.span.kind'] === 'TOOL')!

        expect(llmSpan.parentSpanId).toBe(chainSpan.spanContext().spanId)
        expect(toolSpan.parentSpanId).toBe(chainSpan.spanContext().spanId)
    })
})

// ---------------------------------------------------------------------------
// spanAttributes from config applied to root spans
// ---------------------------------------------------------------------------

describe('spanAttributes from config', () => {
    it('applies custom spanAttributes to the root span', async () => {
        const { handler } = setup({
            spanAttributes: { env: 'staging', team: 'platform' }
        })

        await handler.handleChainStart(serialized(['langchain', 'chains', 'Root']), { input: 'hello' }, 'run-1')
        await handler.handleChainEnd({ output: 'done' }, 'run-1')

        const spans = getSpans()
        expect(spans).toHaveLength(1)
        expect(spans[0].attributes['env']).toBe('staging')
        expect(spans[0].attributes['team']).toBe('platform')
    })
})

// ---------------------------------------------------------------------------
// user.id and session.id from overrideConfig
// ---------------------------------------------------------------------------

describe('overrideConfig analytics', () => {
    it('sets user.id and session.id from overrideConfig.analytics.openTelemetry', async () => {
        const { handler } = setup({
            overrideConfig: {
                analytics: {
                    openTelemetry: {
                        userId: 'user-42',
                        sessionId: 'sess-99'
                    }
                }
            }
        })

        await handler.handleChainStart(serialized(['langchain', 'chains', 'Root']), { input: 'hi' }, 'run-1')
        await handler.handleChainEnd({ output: 'bye' }, 'run-1')

        const spans = getSpans()
        expect(spans).toHaveLength(1)
        expect(spans[0].attributes['user.id']).toBe('user-42')
        expect(spans[0].attributes['session.id']).toBe('sess-99')
    })
})

// ---------------------------------------------------------------------------
// handleAgentAction adds agent.action event
// ---------------------------------------------------------------------------

describe('handleAgentAction', () => {
    it('adds an agent.action event to the span', async () => {
        const { handler } = setup()

        await handler.handleChainStart(serialized(['langchain', 'chains', 'Agent']), { input: 'do something' }, 'run-1')

        await handler.handleAgentAction({ tool: 'search', toolInput: 'find cats', log: 'Thought: I should search' }, 'run-1')

        await handler.handleChainEnd({ output: 'done' }, 'run-1')

        const spans = getSpans()
        expect(spans).toHaveLength(1)

        const agentEvents = spans[0].events.filter((e) => e.name === 'agent.action')
        expect(agentEvents).toHaveLength(1)
        expect(agentEvents[0].attributes!['tool.name']).toBe('search')
        expect(agentEvents[0].attributes!['input.value']).toBe('find cats')
        expect(agentEvents[0].attributes!['agent.log']).toBe('Thought: I should search')
    })
})

// ---------------------------------------------------------------------------
// handleAgentEnd adds agent.finish event to root span
// ---------------------------------------------------------------------------

describe('handleAgentEnd', () => {
    it('adds an agent.finish event to the root span', async () => {
        const { handler } = setup()

        await handler.handleChainStart(serialized(['langchain', 'chains', 'Agent']), { input: 'do something' }, 'run-1')

        await handler.handleAgentEnd({ returnValues: { output: 'final answer' }, log: 'Final Answer: final answer' }, 'run-1')

        await handler.handleChainEnd({ output: 'done' }, 'run-1')

        const spans = getSpans()
        expect(spans).toHaveLength(1)

        const finishEvents = spans[0].events.filter((e) => e.name === 'agent.finish')
        expect(finishEvents).toHaveLength(1)
        expect(finishEvents[0].attributes!['output.value']).toBe(JSON.stringify({ output: 'final answer' }))
        expect(finishEvents[0].attributes!['agent.log']).toBe('Final Answer: final answer')
    })
})

// ---------------------------------------------------------------------------
// handleText adds text.token event
// ---------------------------------------------------------------------------

describe('handleText', () => {
    it('adds a text.token event to the span', async () => {
        const { handler } = setup()

        await handler.handleChainStart(serialized(['langchain', 'chains', 'Root']), { input: 'hi' }, 'run-1')

        await handler.handleText('streaming token', 'run-1')

        await handler.handleChainEnd({ output: 'done' }, 'run-1')

        const spans = getSpans()
        expect(spans).toHaveLength(1)

        const textEvents = spans[0].events.filter((e) => e.name === 'text.token')
        expect(textEvents).toHaveLength(1)
        expect(textEvents[0].attributes!['text.content']).toBe('streaming token')
    })
})

// ---------------------------------------------------------------------------
// handleRetrieverStart + handleRetrieverEnd
// ---------------------------------------------------------------------------

describe('handleRetrieverStart + handleRetrieverEnd', () => {
    it('creates and ends a retrieval span with correct RETRIEVER kind and attributes', async () => {
        const { handler } = setup()

        await handler.handleChainStart(serialized(['langchain', 'chains', 'RetrievalQA']), { input: 'search query' }, 'chain-run')

        await handler.handleRetrieverStart(
            serializedNamed('VectorStoreRetriever'),
            'What is machine learning?',
            'retriever-run',
            'chain-run'
        )

        const documents = [
            { pageContent: 'Machine learning is a subset of AI...', metadata: { source: 'doc1.pdf', page: 1 }, id: 'doc-1' },
            { pageContent: 'ML algorithms learn from data...', metadata: { source: 'doc2.pdf', page: 3 }, id: 'doc-2' }
        ]
        await handler.handleRetrieverEnd(documents, 'retriever-run')
        await handler.handleChainEnd({ output: 'done' }, 'chain-run')

        const spans = getSpans()
        const retrieverSpan = spans.find((s) => s.attributes['openinference.span.kind'] === 'RETRIEVER')
        expect(retrieverSpan).toBeDefined()

        expect(retrieverSpan!.name).toBe('retrieval.VectorStoreRetriever')
        expect(retrieverSpan!.attributes['retrieval.source']).toBe('VectorStoreRetriever')
        expect(retrieverSpan!.attributes['retrieval.query']).toBe('What is machine learning?')
        expect(retrieverSpan!.attributes['input.value']).toBe('What is machine learning?')
        expect(retrieverSpan!.attributes['input.mime_type']).toBe('text/plain')
        expect(retrieverSpan!.attributes['retrieval.num_results']).toBe(2)
        expect(retrieverSpan!.attributes['retrieval.latency_ms']).toBeDefined()
        expect(typeof retrieverSpan!.attributes['retrieval.latency_ms']).toBe('number')

        expect(retrieverSpan!.status.code).toBe(SpanStatusCode.OK)
    })

    it('is a child of the parent chain span', async () => {
        const { handler } = setup()

        await handler.handleChainStart(serialized(['langchain', 'chains', 'RetrievalQA']), { input: 'query' }, 'chain-run')
        await handler.handleRetrieverStart(serializedNamed('ChromaRetriever'), 'query', 'retriever-run', 'chain-run')
        await handler.handleRetrieverEnd([{ pageContent: 'result', metadata: {}, id: 'r1' }], 'retriever-run')
        await handler.handleChainEnd({ output: 'done' }, 'chain-run')

        const spans = getSpans()
        const chainSpan = spans.find((s) => s.name === 'RetrievalQA')!
        const retrieverSpan = spans.find((s) => s.attributes['openinference.span.kind'] === 'RETRIEVER')!

        expect(retrieverSpan.parentSpanId).toBe(chainSpan.spanContext().spanId)
    })

    it('serializes document summaries in output.value and retrieval.documents', async () => {
        const { handler } = setup()

        await handler.handleChainStart(serialized(['langchain', 'chains', 'RAGChain']), { input: 'test' }, 'chain-run')
        await handler.handleRetrieverStart(serializedNamed('Retriever'), 'test query', 'retriever-run', 'chain-run')

        const documents = [{ pageContent: 'Short document content', metadata: { source: 'file.txt' } }]
        await handler.handleRetrieverEnd(documents, 'retriever-run')
        await handler.handleChainEnd({ output: 'done' }, 'chain-run')

        const spans = getSpans()
        const retrieverSpan = spans.find((s) => s.attributes['openinference.span.kind'] === 'RETRIEVER')!

        const outputValue = JSON.parse(retrieverSpan.attributes['output.value'] as string)
        expect(outputValue).toHaveLength(1)
        expect(outputValue[0].pageContentLength).toBe('Short document content'.length)
        expect(outputValue[0].metadata).toEqual({ source: 'file.txt' })

        expect(retrieverSpan.attributes['retrieval.documents']).toBe(retrieverSpan.attributes['output.value'])
    })

    it('handles zero documents returned', async () => {
        const { handler } = setup()

        await handler.handleChainStart(serialized(['langchain', 'chains', 'RAGChain']), { input: 'test' }, 'chain-run')
        await handler.handleRetrieverStart(serializedNamed('Retriever'), 'niche query', 'retriever-run', 'chain-run')
        await handler.handleRetrieverEnd([], 'retriever-run')
        await handler.handleChainEnd({ output: 'done' }, 'chain-run')

        const spans = getSpans()
        const retrieverSpan = spans.find((s) => s.attributes['openinference.span.kind'] === 'RETRIEVER')!

        expect(retrieverSpan.attributes['retrieval.num_results']).toBe(0)
        expect(retrieverSpan.status.code).toBe(SpanStatusCode.OK)
    })
})

// ---------------------------------------------------------------------------
// handleRetrieverError records exception with ERROR status
// ---------------------------------------------------------------------------

describe('handleRetrieverError', () => {
    it('records exception with ERROR status and retrieval.latency_ms', async () => {
        const { handler } = setup()

        await handler.handleChainStart(serialized(['langchain', 'chains', 'RAGChain']), { input: 'test' }, 'chain-run')
        await handler.handleRetrieverStart(serializedNamed('Retriever'), 'query', 'retriever-run', 'chain-run')

        const error = new Error('Connection timeout to vector store')
        await handler.handleRetrieverError(error, 'retriever-run')
        await handler.handleChainEnd({ output: 'done' }, 'chain-run')

        const spans = getSpans()
        const retrieverSpan = spans.find((s) => s.attributes['openinference.span.kind'] === 'RETRIEVER')!

        expect(retrieverSpan.attributes['exception.type']).toBe('Error')
        expect(retrieverSpan.attributes['exception.message']).toBe('Connection timeout to vector store')
        expect(retrieverSpan.status.code).toBe(SpanStatusCode.ERROR)
        expect(retrieverSpan.attributes['retrieval.latency_ms']).toBeDefined()
        expect(typeof retrieverSpan.attributes['retrieval.latency_ms']).toBe('number')

        const events = retrieverSpan.events.filter((e) => e.name === 'exception')
        expect(events.length).toBeGreaterThanOrEqual(1)
    })
})

// ---------------------------------------------------------------------------
// Bounded map / stale entry eviction (Finding 2: CWE-770)
// ---------------------------------------------------------------------------

describe('bounded span map with stale entry eviction', () => {
    it('cleans up insertionTimeMap entries on normal span end', async () => {
        const { handler } = setup()

        await handler.handleChainStart(serialized(['langchain', 'chains', 'Root']), { input: 'hi' }, 'run-1')
        await handler.handleChainEnd({ output: 'done' }, 'run-1')

        // @ts-ignore — accessing private for test verification
        expect(handler['insertionTimeMap'].size).toBe(0)
        // @ts-ignore
        expect(handler['spanMap'].size).toBe(0)
    })

    it('cleans up insertionTimeMap entries on error span end', async () => {
        const { handler } = setup()

        await handler.handleChainStart(serialized(['langchain', 'chains', 'Root']), { input: 'hi' }, 'run-err')
        await handler.handleChainError(new Error('boom'), 'run-err')

        // @ts-ignore
        expect(handler['insertionTimeMap'].size).toBe(0)
        // @ts-ignore
        expect(handler['spanMap'].size).toBe(0)
    })

    it('evicts stale entries that exceed the TTL', async () => {
        const { handler } = setup()

        await handler.handleChainStart(serialized(['langchain', 'chains', 'Root']), { input: 'hi' }, 'stale-run')

        // @ts-ignore — backdate the insertion time to simulate a stale entry
        handler['insertionTimeMap'].set('stale-run', Date.now() - OtelLangChainCallbackHandler.STALE_RUN_TTL_MS - 1)

        // Force capacity so eviction triggers on next startSpan
        // @ts-ignore
        const origMax = OtelLangChainCallbackHandler.MAX_TRACKED_RUNS
        // @ts-ignore
        Object.defineProperty(OtelLangChainCallbackHandler, 'MAX_TRACKED_RUNS', { value: 1, configurable: true })

        await handler.handleChainStart(serialized(['langchain', 'chains', 'New']), { input: 'hello' }, 'new-run')

        // The stale entry should have been evicted
        // @ts-ignore
        expect(handler['spanMap'].has('stale-run')).toBe(false)
        // @ts-ignore
        expect(handler['insertionTimeMap'].has('stale-run')).toBe(false)

        // The new entry should exist
        // @ts-ignore
        expect(handler['spanMap'].has('new-run')).toBe(true)

        await handler.handleChainEnd({ output: 'done' }, 'new-run')

        // Restore original value
        Object.defineProperty(OtelLangChainCallbackHandler, 'MAX_TRACKED_RUNS', { value: origMax, configurable: true })

        const spans = getSpans()
        expect(spans.length).toBeGreaterThanOrEqual(1)
    })

    it('exposes MAX_TRACKED_RUNS and STALE_RUN_TTL_MS as static readonly', () => {
        expect(OtelLangChainCallbackHandler.MAX_TRACKED_RUNS).toBe(10_000)
        expect(OtelLangChainCallbackHandler.STALE_RUN_TTL_MS).toBe(10 * 60 * 1000)
    })
})

// ---------------------------------------------------------------------------
// Reserved attribute key filtering (Finding 5: CWE-20)
// ---------------------------------------------------------------------------

describe('reserved attribute key filtering', () => {
    it('blocks spanAttributes from overwriting reserved keys', async () => {
        const { handler } = setup({
            spanAttributes: {
                'openinference.span.kind': 'EVIL',
                'flowise.chatflow_id': 'hijacked-id',
                'session.id': 'injected-session',
                'service.name': 'attacker-service',
                env: 'staging',
                team: 'platform'
            }
        })

        await handler.handleChainStart(serialized(['langchain', 'chains', 'Root']), { input: 'hello' }, 'run-1')
        await handler.handleChainEnd({ output: 'done' }, 'run-1')

        const spans = getSpans()
        expect(spans).toHaveLength(1)
        const attrs = spans[0].attributes

        expect(attrs['openinference.span.kind']).toBe('CHAIN')
        expect(attrs['flowise.chatflow_id']).toBe('flow-123')
        expect(attrs['env']).toBe('staging')
        expect(attrs['team']).toBe('platform')
    })

    it('blocks customAttributes from overrideConfig from overwriting reserved keys', async () => {
        const { handler } = setup({
            chatId: 'real-chat',
            overrideConfig: {
                analytics: {
                    openTelemetry: {
                        userId: 'user-1',
                        customAttributes: {
                            'openinference.span.kind': 'INJECTED',
                            'flowise.chatflow_id': 'bad-flow',
                            'request.type': 'malicious',
                            metadata: '{"evil": true}',
                            'input.value': 'overwritten-input',
                            'output.value': 'overwritten-output',
                            validKey: 'allowed-value',
                            priority: 42,
                            debug: true
                        }
                    }
                }
            }
        })

        await handler.handleChainStart(serialized(['langchain', 'chains', 'Root']), { input: 'hi' }, 'run-1')
        await handler.handleChainEnd({ output: 'bye' }, 'run-1')

        const spans = getSpans()
        expect(spans).toHaveLength(1)
        const attrs = spans[0].attributes

        expect(attrs['openinference.span.kind']).toBe('CHAIN')
        expect(attrs['flowise.chatflow_id']).toBe('flow-123')
        expect(attrs['request.type']).toBe('chatflow')
        expect(attrs['user.id']).toBe('user-1')

        expect(attrs['validKey']).toBe('allowed-value')
        expect(attrs['priority']).toBe(42)
        expect(attrs['debug']).toBe(true)
    })

    it('allows userId and sessionId overrides through dedicated fields (not customAttributes)', async () => {
        const { handler } = setup({
            chatId: 'original-chat',
            overrideConfig: {
                analytics: {
                    openTelemetry: {
                        userId: 'override-user',
                        sessionId: 'override-session'
                    }
                }
            }
        })

        await handler.handleChainStart(serialized(['langchain', 'chains', 'Root']), { input: 'hi' }, 'run-1')
        await handler.handleChainEnd({ output: 'bye' }, 'run-1')

        const spans = getSpans()
        expect(spans).toHaveLength(1)
        expect(spans[0].attributes['user.id']).toBe('override-user')
        expect(spans[0].attributes['session.id']).toBe('override-session')
    })
})

describe('RESERVED_ATTRIBUTE_KEYS and isReservedAttributeKey', () => {
    it('exports the set of reserved keys', () => {
        expect(RESERVED_ATTRIBUTE_KEYS).toBeInstanceOf(Set)
        expect(RESERVED_ATTRIBUTE_KEYS.has('openinference.span.kind')).toBe(true)
        expect(RESERVED_ATTRIBUTE_KEYS.has('session.id')).toBe(true)
        expect(RESERVED_ATTRIBUTE_KEYS.has('flowise.chatflow_id')).toBe(true)
        expect(RESERVED_ATTRIBUTE_KEYS.has('service.name')).toBe(true)
    })

    it('isReservedAttributeKey returns true for reserved keys', () => {
        expect(isReservedAttributeKey('openinference.span.kind')).toBe(true)
        expect(isReservedAttributeKey('metadata')).toBe(true)
        expect(isReservedAttributeKey('input.value')).toBe(true)
    })

    it('isReservedAttributeKey returns false for user-defined keys', () => {
        expect(isReservedAttributeKey('env')).toBe(false)
        expect(isReservedAttributeKey('team')).toBe(false)
        expect(isReservedAttributeKey('custom.metric')).toBe(false)
    })
})

// ---------------------------------------------------------------------------
// Retriever + LLM + Tool coexist in a chain
// ---------------------------------------------------------------------------

describe('retriever coexists with LLM and tool spans', () => {
    it('produces correct span tree with retriever, LLM, and tool', async () => {
        const { handler } = setup()

        await handler.handleChainStart(serialized(['langchain', 'chains', 'RAGAgent']), { input: 'complex query' }, 'chain-run')

        await handler.handleRetrieverStart(serializedNamed('VectorStore'), 'search docs', 'retriever-run', 'chain-run')
        await handler.handleRetrieverEnd([{ pageContent: 'doc content', metadata: { source: 'db' }, id: 'd1' }], 'retriever-run')

        await handler.handleLLMStart(serialized(['langchain', 'llms', 'ChatOpenAI']), ['synthesize answer'], 'llm-run', 'chain-run', {
            invocation_params: { model: 'gpt-4' }
        })
        await handler.handleLLMEnd({ generations: [[{ text: 'answer' }]], llmOutput: {} }, 'llm-run')

        await handler.handleToolStart(serializedNamed('calculator'), '2+2', 'tool-run', 'chain-run')
        await handler.handleToolEnd('4', 'tool-run')

        await handler.handleChainEnd({ output: 'final' }, 'chain-run')

        const spans = getSpans()
        expect(spans).toHaveLength(4)

        const chainSpan = spans.find((s) => s.name === 'RAGAgent')!
        const retrieverSpan = spans.find((s) => s.attributes['openinference.span.kind'] === 'RETRIEVER')!
        const llmSpan = spans.find((s) => s.attributes['openinference.span.kind'] === 'LLM')!
        const toolSpan = spans.find((s) => s.attributes['openinference.span.kind'] === 'TOOL')!

        expect(retrieverSpan.parentSpanId).toBe(chainSpan.spanContext().spanId)
        expect(llmSpan.parentSpanId).toBe(chainSpan.spanContext().spanId)
        expect(toolSpan.parentSpanId).toBe(chainSpan.spanContext().spanId)
    })
})
