import { ICommonObject } from '../../Interface'
import { OtelDestinationConfig, OtelDestinationConfigSchema } from './OtelConfigSchema'
import { OtelTracerProviderPool } from './OtelTracerProviderPool'
import { OtelLangChainCallbackHandler } from './OtelLangChainCallbackHandler'

interface OtelAnalyticsOptions {
    chatId?: string
    spanAttributes?: Record<string, string>
    overrideConfig?: ICommonObject
}

/**
 * Builds the destination config from credential data, applying Zod defaults.
 */
export function buildDestinationConfig(credentialData: ICommonObject): OtelDestinationConfig {
    let headers: Record<string, string> | undefined

    if (credentialData.otelHeaderKey && credentialData.otelHeaderValue) {
        headers = { [credentialData.otelHeaderKey]: credentialData.otelHeaderValue }
    } else if (credentialData.otelHeaders) {
        try {
            headers = typeof credentialData.otelHeaders === 'string' ? JSON.parse(credentialData.otelHeaders) : credentialData.otelHeaders
        } catch {
            headers = undefined
        }
    }

    return OtelDestinationConfigSchema.parse({
        protocol: credentialData.otelProtocol ?? 'http/protobuf',
        endpoint: credentialData.otelEndpoint,
        headers,
        serviceName: credentialData.otelServiceName || undefined,
        environment: credentialData.otelEnvironment || undefined,
        samplingRate: credentialData.otelSamplingRate != null ? Number(credentialData.otelSamplingRate) : undefined,
        maxQueueSize: credentialData.otelMaxQueueSize != null ? Number(credentialData.otelMaxQueueSize) : undefined,
        scheduleDelayMs: credentialData.otelScheduleDelayMs != null ? Number(credentialData.otelScheduleDelayMs) : undefined,
        maxExportBatchSize: credentialData.otelMaxExportBatchSize != null ? Number(credentialData.otelMaxExportBatchSize) : undefined,
        exportTimeoutMs: credentialData.otelExportTimeoutMs != null ? Number(credentialData.otelExportTimeoutMs) : undefined,
        tlsInsecure: credentialData.otelTlsInsecure === true || credentialData.otelTlsInsecure === 'true'
    })
}

export async function getCallbackHandler(
    chatflowId: string,
    otelConfig: ICommonObject,
    credentialData: ICommonObject,
    options: OtelAnalyticsOptions
): Promise<OtelLangChainCallbackHandler> {
    const destConfig = buildDestinationConfig(credentialData)
    const pool = OtelTracerProviderPool.getInstance()
    const tracer = await pool.getOrCreate(chatflowId, destConfig)

    return new OtelLangChainCallbackHandler({
        tracer,
        chatflowId,
        chatId: options.chatId,
        spanAttributes: otelConfig.spanAttributes ?? options.spanAttributes,
        overrideConfig: options.overrideConfig
    })
}
