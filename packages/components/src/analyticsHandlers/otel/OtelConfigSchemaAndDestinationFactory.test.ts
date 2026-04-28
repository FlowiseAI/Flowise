import { OtelDestinationConfigSchema } from './OtelConfigSchema'
import { createExporterForDestination, createTracerProvider, sanitizeError } from './OtelDestinationFactory'
import { OTLPTraceExporter as OTLPTraceExporterProto } from '@opentelemetry/exporter-trace-otlp-proto'
import { OTLPTraceExporter as OTLPTraceExporterGrpc } from '@opentelemetry/exporter-trace-otlp-grpc'
import { NodeTracerProvider } from '@opentelemetry/sdk-trace-node'
import { ATTR_SERVICE_NAME, ATTR_SERVICE_VERSION } from '@opentelemetry/semantic-conventions'
import type { OtelDestinationConfig } from './OtelConfigSchema'
import { version as FLOWISE_VERSION } from '../../../package.json'

// ---------------------------------------------------------------------------
// OtelDestinationConfigSchema defaults
// ---------------------------------------------------------------------------

describe('OtelDestinationConfigSchema', () => {
    it('applies correct defaults for optional fields', () => {
        const result = OtelDestinationConfigSchema.parse({ endpoint: 'https://otlp.example.com' })

        expect(result.enabled).toBe(true)
        expect(result.protocol).toBe('http/protobuf')
        expect(result.serviceName).toBe('flowise')
        expect(result.environment).toBe('production')
        expect(result.samplingRate).toBe(1.0)
        expect(result.maxQueueSize).toBe(2048)
        expect(result.scheduleDelayMs).toBe(5000)
        expect(result.maxExportBatchSize).toBe(512)
        expect(result.exportTimeoutMs).toBe(30000)
        expect(result.tlsInsecure).toBe(false)
        expect(result.id).toBeUndefined()
        expect(result.label).toBeUndefined()
        expect(result.headers).toBeUndefined()
    })

    // -----------------------------------------------------------------------
    // Endpoint URL validation
    // -----------------------------------------------------------------------

    it('accepts a valid HTTPS endpoint', () => {
        const result = OtelDestinationConfigSchema.parse({ endpoint: 'https://otlp.example.com:4318/v1/traces' })
        expect(result.endpoint).toBe('https://otlp.example.com:4318/v1/traces')
    })

    it('accepts a valid HTTP endpoint', () => {
        const result = OtelDestinationConfigSchema.parse({ endpoint: 'http://localhost:4318' })
        expect(result.endpoint).toBe('http://localhost:4318')
    })

    it('rejects a non-URL string', () => {
        expect(() => OtelDestinationConfigSchema.parse({ endpoint: 'not-a-url' })).toThrow()
    })

    it('rejects an empty string', () => {
        expect(() => OtelDestinationConfigSchema.parse({ endpoint: '' })).toThrow()
    })

    it('rejects file:// protocol', () => {
        expect(() => OtelDestinationConfigSchema.parse({ endpoint: 'file:///etc/passwd' })).toThrow(/http:\/\/ or https:\/\//)
    })

    it('rejects ftp:// protocol', () => {
        expect(() => OtelDestinationConfigSchema.parse({ endpoint: 'ftp://example.com/data' })).toThrow(/http:\/\/ or https:\/\//)
    })
})

// ---------------------------------------------------------------------------
// OpenTelemetry credential vendor preset endpoints pass schema validation
//
// Regression guard: preset endpoints must be real URLs that satisfy
// z.string().url(). Placeholder syntax like <account> or <region> would throw
// a ZodError the first time a user selected the preset without editing it.
// ---------------------------------------------------------------------------

describe('OpenTelemetry credential vendor presets', () => {
    const { credClass: OpenTelemetryApi } = require('../../../credentials/OpenTelemetryApi.credential')
    const cred = new OpenTelemetryApi()
    const vendorPresetInput = cred.inputs.find((input: { name: string }) => input.name === 'otelVendorPreset')
    const autoPopulate = vendorPresetInput?.autoPopulate
    if (!autoPopulate) throw new Error('OpenTelemetry vendor preset input must define autoPopulate')

    it.each(Object.keys(autoPopulate))('preset %s endpoint parses against OtelDestinationConfigSchema', (preset) => {
        const endpoint = autoPopulate[preset].otelEndpoint
        expect(() => OtelDestinationConfigSchema.parse({ endpoint })).not.toThrow()
    })
})

// ---------------------------------------------------------------------------
// createExporterForDestination returns OTLPTraceExporterProto
// ---------------------------------------------------------------------------

function makeConfig(overrides: Partial<OtelDestinationConfig> = {}): OtelDestinationConfig {
    return OtelDestinationConfigSchema.parse({
        endpoint: 'https://otlp.example.com',
        ...overrides
    })
}

describe('createExporterForDestination', () => {
    it('returns OTLPTraceExporterProto for http/protobuf protocol', () => {
        const exporter = createExporterForDestination(makeConfig({ protocol: 'http/protobuf' }))
        expect(exporter).toBeInstanceOf(OTLPTraceExporterProto)
    })

    // -----------------------------------------------------------------------
    // Returns OTLPTraceExporterGrpc for grpc
    // -----------------------------------------------------------------------

    it('returns OTLPTraceExporterGrpc for grpc protocol', () => {
        const exporter = createExporterForDestination(makeConfig({ protocol: 'grpc' }))
        expect(exporter).toBeInstanceOf(OTLPTraceExporterGrpc)
    })
})

// ---------------------------------------------------------------------------
// createTracerProvider creates provider with correct resource attributes
// ---------------------------------------------------------------------------

describe('createTracerProvider', () => {
    afterEach(() => {
        jest.restoreAllMocks()
    })

    it('creates a NodeTracerProvider with correct resource attributes', () => {
        const config = makeConfig({
            serviceName: 'test-service',
            environment: 'staging'
        })
        const chatflowId = 'flow-abc-123'
        const provider = createTracerProvider(config, chatflowId)

        expect(provider).toBeInstanceOf(NodeTracerProvider)

        const resource = provider.resource
        const attrs = resource.attributes

        expect(attrs[ATTR_SERVICE_NAME]).toBe('test-service')
        expect(attrs[ATTR_SERVICE_VERSION]).toBe(FLOWISE_VERSION)
        expect(attrs['deployment.environment']).toBe('staging')
        expect(attrs['flowise.chatflow_id']).toBe('flow-abc-123')

        provider.shutdown()
    })

    // -----------------------------------------------------------------------
    // TLS insecure warning is logged
    // -----------------------------------------------------------------------

    it('logs a warning when tlsInsecure is true', () => {
        const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {})

        const config = makeConfig({ tlsInsecure: true })
        const provider = createTracerProvider(config, 'flow-test')

        expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('TLS verification is disabled'))

        provider.shutdown()
    })

    it('logs at error level when tlsInsecure is true in production', () => {
        const origEnv = process.env.NODE_ENV
        process.env.NODE_ENV = 'production'
        const errorSpy = jest.spyOn(console, 'warn').mockImplementation(() => {})

        const config = makeConfig({ tlsInsecure: true })
        const provider = createTracerProvider(config, 'flow-test')

        expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining('TLS verification is disabled in a production environment'))

        provider.shutdown()
        process.env.NODE_ENV = origEnv
    })

    it('does not log a warning when tlsInsecure is false', () => {
        const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {})

        const config = makeConfig({ tlsInsecure: false })
        const provider = createTracerProvider(config, 'flow-test')

        expect(warnSpy).not.toHaveBeenCalledWith(expect.stringContaining('TLS verification is disabled'))

        provider.shutdown()
    })
})

// ---------------------------------------------------------------------------
// sanitizeError strips sensitive data
// ---------------------------------------------------------------------------

describe('sanitizeError', () => {
    it('strips Bearer tokens', () => {
        const result = sanitizeError(new Error('Failed: Bearer sk-abc123xyz'))
        expect(result).not.toContain('sk-abc123xyz')
        expect(result).toContain('Bearer [REDACTED]')
    })

    it('strips API key patterns', () => {
        const result = sanitizeError(new Error('Header api-key=my-secret-key-here'))
        expect(result).not.toContain('my-secret-key-here')
        expect(result).toContain('api-key=[REDACTED]')
    })

    it('strips authorization header values', () => {
        const result = sanitizeError(new Error('authorization: Basic dXNlcjpwYXNz'))
        expect(result).not.toContain('Basic dXNlcjpwYXNz')
        expect(result).toContain('authorization=[REDACTED]')
    })

    it('strips credentials from URLs', () => {
        const result = sanitizeError(new Error('Connection to https://user:pass@example.com failed'))
        expect(result).not.toContain('user:pass')
        expect(result).toContain('[REDACTED_URL]@')
    })

    it('handles non-Error input', () => {
        const result = sanitizeError('Bearer secret-token-123')
        expect(result).not.toContain('secret-token-123')
        expect(result).toContain('Bearer [REDACTED]')
    })

    it('returns the message unchanged when no sensitive patterns are present', () => {
        const result = sanitizeError(new Error('Connection timeout'))
        expect(result).toBe('Connection timeout')
    })
})
