import type Stripe from 'stripe'

// Interface definitions for billing service

export type ObservationLevel = 'DEBUG' | 'DEFAULT' | 'WARNING' | 'ERROR'
export type UsageUnit = 'CHARACTERS' | 'TOKENS' | 'MILLISECONDS' | 'SECONDS' | 'IMAGES' | 'REQUESTS'

// Update the usage interface to match API
export interface Usage {
    input?: null | number
    inputCost?: null | number
    output?: null | number
    outputCost?: null | number
    total?: null | number
    totalCost?: null | number
    unit?: UsageUnit
}

// Update the observation interface to match API
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

// Update the trace metadata interface
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

// Update the credits data interface
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

// Score types for the API
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

// Update the Langfuse trace interface based on their API
export interface LangfuseTrace {
    // Required fields
    id: string
    timestamp: string
    htmlPath: string
    latency: number
    totalCost: number
    observations: Observation[]
    scores: Score[]

    // Optional fields
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

    // Methods
    update(data: { metadata: TraceMetadata }): Promise<void>
}

export interface UsageMetric {
    used: number
    total: number
    credits: number
    cost: number
    rate: number
}

export interface UsageStats {
    ai_tokens: UsageMetric
    compute: UsageMetric
    storage: UsageMetric
    total_credits: number
    total_cost: number
    billing_period: {
        start: string
        end: string
    }
}

export interface SubscriptionPlan {
    id: string
    name: string
    description: string
    features: string[]
    limits: {
        ai_tokens: number
        compute: number
        storage: number
    }
    price: {
        amount: number
        currency: string
        interval: 'month' | 'year'
    }
    metadata?: Record<string, any>
}

export interface CreateSubscriptionParams {
    customerId: string
    priceId: string
    paymentMethodId?: string
    trialDays?: number
}

export interface UpdateSubscriptionParams {
    subscriptionId: string
    priceId: string
}

export interface PaymentMethodParams {
    customerId: string
    paymentMethodId: string
}

export interface UpcomingInvoiceParams {
    customerId: string
    subscriptionId?: string
    priceId?: string
}

export interface BillingPortalParams {
    customerId: string
    returnUrl: string
}

export interface CustomerParams {
    email: string
    name?: string
    metadata?: Record<string, string>
}
