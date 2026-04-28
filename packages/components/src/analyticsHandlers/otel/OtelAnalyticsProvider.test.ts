import { NodeTracerProvider } from '@opentelemetry/sdk-trace-node'
import { OtelTracerProviderPool } from './OtelTracerProviderPool'
import { buildDestinationConfig, getCallbackHandler } from './OtelAnalyticsProvider'
import { OtelLangChainCallbackHandler } from './OtelLangChainCallbackHandler'

const mockTracer = { startSpan: jest.fn() }
const mockForceFlush = jest.fn().mockResolvedValue(undefined)
const mockShutdown = jest.fn().mockResolvedValue(undefined)

jest.mock('../../../src/analyticsHandlers/otel/OtelDestinationFactory', () => ({
    createTracerProvider: jest.fn(() => {
        const provider = Object.create(NodeTracerProvider.prototype) as NodeTracerProvider
        ;(provider as any).forceFlush = mockForceFlush
        ;(provider as any).shutdown = mockShutdown
        ;(provider as any).getTracer = jest.fn().mockReturnValue(mockTracer)
        return provider
    })
}))

describe('buildDestinationConfig', () => {
    // -------------------------------------------------------------------
    // maps credential fields correctly and applies Zod defaults
    // -------------------------------------------------------------------

    it('maps credential fields correctly and applies Zod defaults', () => {
        const cred = {
            otelEndpoint: 'https://otlp.example.com/v1/traces',
            otelProtocol: 'grpc',
            otelServiceName: 'my-service',
            otelEnvironment: 'staging',
            otelSamplingRate: '0.5',
            otelMaxQueueSize: '4096',
            otelScheduleDelayMs: '10000',
            otelMaxExportBatchSize: '1024',
            otelExportTimeoutMs: '60000',
            otelTlsInsecure: 'true'
        }

        const result = buildDestinationConfig(cred)

        expect(result.endpoint).toBe('https://otlp.example.com/v1/traces')
        expect(result.protocol).toBe('grpc')
        expect(result.serviceName).toBe('my-service')
        expect(result.environment).toBe('staging')
        expect(result.samplingRate).toBe(0.5)
        expect(result.maxQueueSize).toBe(4096)
        expect(result.scheduleDelayMs).toBe(10000)
        expect(result.maxExportBatchSize).toBe(1024)
        expect(result.exportTimeoutMs).toBe(60000)
        expect(result.tlsInsecure).toBe(true)
    })

    it('applies Zod defaults when optional credential fields are absent', () => {
        const cred = {
            otelEndpoint: 'https://otlp.example.com'
        }

        const result = buildDestinationConfig(cred)

        expect(result.protocol).toBe('http/protobuf')
        expect(result.serviceName).toBe('flowise')
        expect(result.environment).toBe('production')
        expect(result.samplingRate).toBe(1.0)
        expect(result.maxQueueSize).toBe(2048)
        expect(result.scheduleDelayMs).toBe(5000)
        expect(result.maxExportBatchSize).toBe(512)
        expect(result.exportTimeoutMs).toBe(30000)
        expect(result.tlsInsecure).toBe(false)
        expect(result.enabled).toBe(true)
        expect(result.headers).toBeUndefined()
    })

    // -------------------------------------------------------------------
    // constructs headers from otelHeaderKey / otelHeaderValue pair
    // -------------------------------------------------------------------

    it('constructs headers from otelHeaderKey/otelHeaderValue pair', () => {
        const cred = {
            otelEndpoint: 'https://otlp.example.com',
            otelHeaderKey: 'api-key',
            otelHeaderValue: 'secret-123'
        }

        const result = buildDestinationConfig(cred)

        expect(result.headers).toEqual({ 'api-key': 'secret-123' })
    })

    it('ignores header key when value is missing', () => {
        const cred = {
            otelEndpoint: 'https://otlp.example.com',
            otelHeaderKey: 'api-key'
        }

        const result = buildDestinationConfig(cred)

        expect(result.headers).toBeUndefined()
    })

    // -------------------------------------------------------------------
    // falls back to parsing otelHeaders JSON string
    // -------------------------------------------------------------------

    it('falls back to parsing otelHeaders JSON string when key/value pair is absent', () => {
        const cred = {
            otelEndpoint: 'https://otlp.example.com',
            otelHeaders: JSON.stringify({ 'x-custom': 'value1', 'x-other': 'value2' })
        }

        const result = buildDestinationConfig(cred)

        expect(result.headers).toEqual({ 'x-custom': 'value1', 'x-other': 'value2' })
    })

    it('accepts otelHeaders as an already-parsed object', () => {
        const cred = {
            otelEndpoint: 'https://otlp.example.com',
            otelHeaders: { 'x-token': 'abc' }
        }

        const result = buildDestinationConfig(cred)

        expect(result.headers).toEqual({ 'x-token': 'abc' })
    })

    it('falls back to undefined headers when otelHeaders is invalid JSON', () => {
        const cred = {
            otelEndpoint: 'https://otlp.example.com',
            otelHeaders: 'not-valid-json'
        }

        const result = buildDestinationConfig(cred)

        expect(result.headers).toBeUndefined()
    })

    it('prefers otelHeaderKey/otelHeaderValue over otelHeaders', () => {
        const cred = {
            otelEndpoint: 'https://otlp.example.com',
            otelHeaderKey: 'api-key',
            otelHeaderValue: 'from-pair',
            otelHeaders: JSON.stringify({ 'api-key': 'from-json' })
        }

        const result = buildDestinationConfig(cred)

        expect(result.headers).toEqual({ 'api-key': 'from-pair' })
    })
})

// ---------------------------------------------------------------------------
// getCallbackHandler returns an OtelLangChainCallbackHandler
// ---------------------------------------------------------------------------

describe('getCallbackHandler', () => {
    beforeEach(() => {
        OtelTracerProviderPool.resetInstance()
        jest.clearAllMocks()
        jest.spyOn(console, 'info').mockImplementation(() => {})
        jest.spyOn(console, 'warn').mockImplementation(() => {})
    })

    afterEach(() => {
        jest.restoreAllMocks()
    })

    it('returns an OtelLangChainCallbackHandler instance', async () => {
        const otelConfig = { status: true, spanAttributes: { tenant: 'acme' } }
        const credentialData = {
            otelEndpoint: 'https://otlp.example.com',
            otelHeaderKey: 'api-key',
            otelHeaderValue: 'secret'
        }

        const handler = await getCallbackHandler('flow-42', otelConfig, credentialData, {
            chatId: 'chat-1'
        })

        expect(handler).toBeInstanceOf(OtelLangChainCallbackHandler)
    })

    it('passes spanAttributes from otelConfig to the handler', async () => {
        const otelConfig = { status: true, spanAttributes: { tenant: 'acme' } }
        const credentialData = { otelEndpoint: 'https://otlp.example.com' }

        const handler = await getCallbackHandler('flow-42', otelConfig, credentialData, {})

        expect(handler).toBeInstanceOf(OtelLangChainCallbackHandler)
        expect(handler.name).toBe('otel_langchain_handler')
    })

    it('pools the tracer for the same chatflowId', async () => {
        const credentialData = { otelEndpoint: 'https://otlp.example.com' }

        await getCallbackHandler('flow-42', {}, credentialData, {})
        await getCallbackHandler('flow-42', {}, credentialData, {})

        const pool = OtelTracerProviderPool.getInstance()
        expect(pool.size).toBe(1)
    })
})
