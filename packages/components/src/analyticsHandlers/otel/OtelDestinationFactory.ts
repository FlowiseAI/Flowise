import { Metadata, credentials } from '@grpc/grpc-js'
import { OTLPTraceExporter as OTLPTraceExporterProto } from '@opentelemetry/exporter-trace-otlp-proto'
import { OTLPTraceExporter as OTLPTraceExporterGrpc } from '@opentelemetry/exporter-trace-otlp-grpc'
import { CompressionAlgorithm } from '@opentelemetry/otlp-exporter-base'
import { Resource } from '@opentelemetry/resources'
import { BatchSpanProcessor, AlwaysOnSampler, TraceIdRatioBasedSampler, SpanExporter } from '@opentelemetry/sdk-trace-base'
import { NodeTracerProvider } from '@opentelemetry/sdk-trace-node'
import { ATTR_SERVICE_NAME, ATTR_SERVICE_VERSION } from '@opentelemetry/semantic-conventions'

import { OtelDestinationConfig } from './OtelConfigSchema'
import { version as FLOWISE_VERSION } from '../../../package.json'

export function sanitizeError(err: unknown): string {
    const msg = err instanceof Error ? err.message : String(err)
    return msg
        .replace(/Bearer\s+\S+/gi, 'Bearer [REDACTED]')
        .replace(/api[-_]?key[=:]\s*\S+/gi, 'api-key=[REDACTED]')
        .replace(/authorization[=:]\s*\S+/gi, 'authorization=[REDACTED]')
        .replace(/https?:\/\/[^@\s]*@/gi, '[REDACTED_URL]@')
}

export function createExporterForDestination(config: OtelDestinationConfig): SpanExporter {
    try {
        if (config.protocol === 'grpc') {
            const metadata = new Metadata()
            if (config.headers) {
                for (const [key, value] of Object.entries(config.headers)) {
                    metadata.set(key, value)
                }
            }
            return new OTLPTraceExporterGrpc({
                url: config.endpoint,
                metadata,
                credentials: config.tlsInsecure ? credentials.createInsecure() : credentials.createSsl(),
                timeoutMillis: config.exportTimeoutMs
            })
        }

        return new OTLPTraceExporterProto({
            url: config.endpoint,
            headers: config.headers ?? {},
            compression: CompressionAlgorithm.GZIP,
            timeoutMillis: config.exportTimeoutMs
        })
    } catch (err) {
        const safe = sanitizeError(err)
        if (process.env.DEBUG === 'true') console.error(`[OTEL] Failed to create exporter: ${safe}`)
        throw new Error(`OTEL exporter creation failed: ${safe}`)
    }
}

export function createTracerProvider(config: OtelDestinationConfig, chatflowId: string): NodeTracerProvider {
    if (config.tlsInsecure) {
        if (process.env.NODE_ENV === 'production') {
            console.warn('[OTEL] TLS verification is disabled in a production environment — this is strongly discouraged')
        } else {
            console.warn('[OTEL] TLS verification is disabled — this is insecure and should only be used in development')
        }
    }

    const resource = new Resource({
        [ATTR_SERVICE_NAME]: config.serviceName,
        [ATTR_SERVICE_VERSION]: FLOWISE_VERSION,
        'deployment.environment': config.environment,
        'flowise.chatflow_id': chatflowId
    })

    const sampler = config.samplingRate < 1.0 ? new TraceIdRatioBasedSampler(config.samplingRate) : new AlwaysOnSampler()

    const provider = new NodeTracerProvider({
        resource,
        sampler
    })

    try {
        const exporter = createExporterForDestination(config)
        provider.addSpanProcessor(
            new BatchSpanProcessor(exporter, {
                maxQueueSize: config.maxQueueSize,
                scheduledDelayMillis: config.scheduleDelayMs,
                maxExportBatchSize: config.maxExportBatchSize,
                exportTimeoutMillis: config.exportTimeoutMs
            })
        )
    } catch (err) {
        const safe = sanitizeError(err)
        if (process.env.DEBUG === 'true') console.error(`[OTEL] Failed to configure TracerProvider: ${safe}`)
        throw new Error(`OTEL TracerProvider configuration failed: ${safe}`)
    }

    return provider
}
