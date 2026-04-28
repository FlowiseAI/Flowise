import { z } from 'zod'

export const OtelDestinationConfigSchema = z.object({
    id: z.string().optional(),
    label: z.string().optional(),
    enabled: z.boolean().default(true),
    protocol: z.enum(['http/protobuf', 'grpc']).default('http/protobuf'),
    endpoint: z
        .string()
        .url('Endpoint must be a valid URL')
        .refine(
            (url) => {
                try {
                    const parsed = new URL(url)
                    return parsed.protocol === 'http:' || parsed.protocol === 'https:'
                } catch {
                    return false
                }
            },
            { message: 'Endpoint must use http:// or https:// protocol' }
        ),
    headers: z.record(z.string(), z.string()).optional(),
    serviceName: z.string().default('flowise'),
    environment: z.string().default('production'),
    samplingRate: z.number().min(0).max(1).default(1.0),
    maxQueueSize: z.number().int().positive().default(2048),
    scheduleDelayMs: z.number().int().positive().default(5000),
    maxExportBatchSize: z.number().int().positive().default(512),
    exportTimeoutMs: z.number().int().positive().default(30000),
    tlsInsecure: z.boolean().default(false)
})

export type OtelDestinationConfig = z.infer<typeof OtelDestinationConfigSchema>
