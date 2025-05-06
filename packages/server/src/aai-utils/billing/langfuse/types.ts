export type ObservationLevel = 'DEBUG' | 'DEFAULT' | 'WARNING' | 'ERROR'
export type UsageUnit = 'CHARACTERS' | 'TOKENS' | 'MILLISECONDS' | 'SECONDS' | 'IMAGES' | 'REQUESTS'

export interface Usage {
    input?: null | number
    inputCost?: null | number
    output?: null | number
    outputCost?: null | number
    total?: null | number
    totalCost?: null | number
    unit?: UsageUnit
}

export interface Observation {
    id: string
    type: string
    traceId?: null | string
    name?: null | string
    startTime: string
    endTime?: null | string
    completionStartTime?: null | string
    level: ObservationLevel
    statusMessage?: null | string
    modelId?: null | string
    model?: null | string
    promptId?: null | string
    promptName?: null | string
    promptVersion?: null | number
    version?: null | string
    metadata?: unknown
    input?: unknown
    output?: unknown
    latency?: null | number
    timeToFirstToken?: null | number
    parentObservationId?: null | string
    modelParameters?: null | Record<string, any>
    usage?: Usage
    usageDetails?: null | Record<string, number>
    costDetails?: null | Record<string, number>
    inputPrice?: null | number
    outputPrice?: null | number
    totalPrice?: null | number
    calculatedInputCost?: null | number
    calculatedOutputCost?: null | number
    calculatedTotalCost?: null | number
}

export interface TraceMetadata {
    chatId?: string
    chatflowid?: string
    userId?: string
    customerId?: string
    subscriptionId?: string // Stripe subscription ID
    subscriptionTier?: string
    stripeBilled?: boolean
    stripeProcessing?: boolean
    stripeProcessingStartedAt?: string
    stripeBilledAt?: string
    creditsBilled?: Record<string, number>
    stripeError?: string
    stripeBilledTypes?: string[]
    stripePartialBilled?: boolean
    [key: string]: any // Allow additional metadata fields
}

export interface CreditsData {
    traceId: string
    customerId: string
    subscriptionTier: string
    usage: {
        totalCost: number
        tokens: number
        computeMinutes: number
        storageGB: number
        models: Array<{
            model: string
            inputTokens: number
            outputTokens: number
            totalTokens: number
        }>
    }
    credits: {
        total: number
        ai_tokens: number
        compute: number
        storage: number
        cost: number
    }
    metadata: {
        timestamp?: string
        [key: string]: any
    }
}

export type ScoreDataType = 'number' | 'string' | 'boolean'
export type ScoreSource = 'API' | 'EXTERNAL' | 'MODEL' | 'USER'

interface BaseScore {
    id: string
    name: string
    traceId: string
    observationId?: null | string
    timestamp: string
    createdAt: string
    updatedAt: string
    comment?: null | string
    source: ScoreSource
    authorUserId?: null | string
    configId?: null | string
    queueId?: null | string
    dataType: ScoreDataType
}

interface NumberScore extends BaseScore {
    dataType: 'number'
    value: number
}

interface StringScore extends BaseScore {
    dataType: 'string'
    stringValue: string
    value?: never
}

interface BooleanScore extends BaseScore {
    dataType: 'boolean'
    stringValue: string
    value: boolean
}

export type Score = NumberScore | StringScore | BooleanScore

export interface LangfuseTrace {
    id: string
    timestamp: string
    htmlPath: string
    latency: number
    totalCost: number
    observations: Observation[]
    scores: Score[]
    name?: null | string
    input?: unknown
    output?: unknown
    metadata?: TraceMetadata
    public?: null | boolean
    release?: null | string
    sessionId?: null | string
    tags?: null | string[]
    userId?: null | string
    version?: null | string
    update(data: { metadata: TraceMetadata }): Promise<void>
}

export interface LangfuseOptions {
    publicKey: string
    secretKey: string
    baseUrl?: string
}

export interface LangfuseClient {
    new (options: LangfuseOptions): LangfuseClient
    trace(id: string, metadata?: { metadata: TraceMetadata }): Promise<LangfuseTrace>
    fetchTrace(id: string): Promise<{ data: LangfuseTrace }>
    fetchObservation(id: string): Promise<Observation>
    fetchTraces(options: {
        fromTimestamp?: string | null
        limit?: number | null
        name?: string | null
        orderBy?: string | null
        page?: number | null
        release?: string | null
        sessionId?: string | null
        tags?: (string | null)[]
        toTimestamp?: string | null
        userId?: string | null
        version?: string | null
        filter?: Record<string, any>
        cursor?: string
    }): Promise<{
        data: LangfuseTrace[]
        meta: {
            limit: number
            page: number
            totalItems: number
            totalPages: number
        }
    }>
}
