import type Stripe from 'stripe'
import { IUser } from '../../../Interface'

export interface BillingCustomer {
    id: string
    email?: string
    name?: string
    metadata?: Record<string, any>
}

export interface PaymentMethod {
    id: string
    type: string
    last4?: string
    expMonth?: number
    expYear?: number
}

export interface Subscription {
    id: string
    customerId: string
    status: 'active' | 'canceled' | 'past_due' | 'incomplete' | 'incomplete_expired' | 'trialing' | 'unpaid'
    currentPeriodStart: Date
    currentPeriodEnd: Date
    cancelAtPeriodEnd: boolean
}

export interface SubscriptionWithUsage extends Subscription {
    usage: Array<Stripe.Billing.MeterEventSummary & { meter_name: string }>
}

export interface UsageMetric {
    used: number
    total: number
    credits: number
    cost: number
    rate: number
}

export interface UsageStats {
    total_credits: number
    usageByMeter: Record<string, number>
    dailyUsageByMeter: Record<string, Array<{ date: Date; value: number }>>
    billingPeriod?: {
        start: Date
        end: Date
        current: Date
    }
    lastUpdated: Date
    upcomingInvoice?: UsageSummary['upcomingInvoice']
    summaries?: any
}

export interface BillingPortalSession {
    url: string
    returnUrl: string
}

export interface CheckoutSession {
    url: string
}

export interface Invoice {
    id: string
    customerId: string
    amount: number
    currency: string
    status: string
    created: Date
    dueDate?: Date
}

export interface BillingProvider {
    createCustomer(params: CreateCustomerParams): Promise<BillingCustomer>
    attachPaymentMethod(params: AttachPaymentMethodParams): Promise<PaymentMethod>
    createCheckoutSession(params: CreateCheckoutSessionParams): Promise<CheckoutSession>
    createBillingPortalSession(params: CreateBillingPortalSessionParams): Promise<BillingPortalSession>
    updateSubscription(params: UpdateSubscriptionParams): Promise<Subscription>
    cancelSubscription(subscriptionId: string): Promise<Subscription>
    getUpcomingInvoice(params: GetUpcomingInvoiceParams): Promise<Invoice>

    syncUsageToStripe(traceId?: string): Promise<{ processedTraces: string[]; failedTraces: Array<{ traceId: string; error: string }> }>
    listSubscriptions(params: Stripe.SubscriptionListParams): Promise<Stripe.Response<Stripe.ApiList<Stripe.Subscription>>>
    getSubscriptionWithUsage(subscriptionId: string): Promise<SubscriptionWithUsage>
    handleWebhook(payload: any, signature: string): Promise<any>
}

export interface CreateCustomerParams {
    email: string
    name?: string
    metadata?: Record<string, any>
}

export interface AttachPaymentMethodParams {
    customerId: string
    paymentMethodId: string
}

export interface CreateCheckoutSessionParams {
    customerId: string
    priceId?: string
    successUrl: string
    cancelUrl: string
}

export interface CreateBillingPortalSessionParams {
    customerId: string
    returnUrl: string
}

export interface UpdateSubscriptionParams {
    subscriptionId: string
    priceId: string
}

export interface GetUpcomingInvoiceParams {
    customerId: string
    subscriptionId?: string
    priceId?: string
}

export interface CreditsData {
    traceId: string
    stripeCustomerId: string
    subscriptionTier: string
    userId: string
    organizationId: string
    aiCredentialsOwnership: string
    timestamp: string
    timestampEpoch: number
    credits: {
        ai_tokens: number
        compute: number
        storage: number
        unknown?: number
        total: number
    }
    metadata: Record<string, any>
    usage: {
        tokens: number
        computeMinutes: number
        storageGB: number
        totalCost: number
        models: Array<{
            model: string
            inputTokens: number
            outputTokens: number
            totalTokens: number
            costUSD: number
        }>
    }
    costs: {
        base: {
            ai: number
            compute: number
            storage: number
            unknown?: number
            total: number
        }
        withMargin: {
            total: number
            marginMultiplier: number
        }
    }
}

export interface LangfuseTrace {
    id: string
    timestamp: string
    htmlPath: string
    latency: number
    totalCost: number
    observations: Array<{
        id: string
        model?: string
        usage?: {
            input?: number
            output?: number
            total?: number
        }
        calculatedTotalCost?: number
    }>
    metadata?: TraceMetadata
}

export interface TraceMetadata {
    stripeCustomerId: string
    subscriptionTier?: string
    userId: string
    organizationId: string
    aiCredentialsOwnership: string
    [key: string]: any
}

export const CREDIT_RATES = {
    AI_TOKENS: {
        TOKENS_PER_CREDIT: 10,
        COST_PER_CREDIT: 0.001
    },
    COMPUTE: {
        MINUTES_PER_CREDIT: 1 / 50,
        COST_PER_CREDIT: 0.001
    },
    STORAGE: {
        GB_PER_CREDIT: 1 / 500,
        COST_PER_CREDIT: 0.001
    }
}

export interface MeterEvent extends Stripe.Billing.MeterEvent {
    payload: {
        // Required fields
        value: string
        stripe_customer_id: string
        trace_id: string
        // Cost tracking
        base_cost: string
        total_cost: string
        margin: string
        // Credit breakdown
        ai_credits: string
        compute_credits: string
        storage_credits: string
        dateTimestamp?: string
    }
}

export interface SyncUsageResponse {
    processedTraces: string[]
    failedTraces: Array<{ traceId: string; error: string }>
    skippedTraces: Array<{ traceId: string; reason: string }>
    meterEvents?: Stripe.Billing.MeterEvent[]
    traces?: any[]
    creditsData?: CreditsData[]
}

export interface UsageSummary {
    currentPlan: {
        name: 'Free' | 'Pro'
        status: 'active' | 'inactive'
        creditsIncluded: number
    }
    usageDashboard: {
        totalMessages: number
        totalMessagesSent: number
        totalMessagesGenerated: number
        totalChats: number
        organizationTotalMessages: number
        organizationTotalMessagesSent: number
        organizationTotalMessagesGenerated: number
        organizationTotalChats: number
        aiTokens: {
            used: number
            total: number
            rate: number
            cost: number
        }
        compute: {
            used: number
            total: number
            rate: number
            cost: number
        }
        storage: {
            used: number
            total: number
            rate: number
            cost: number
        }
    }
    billingPeriod: {
        start: Date
        end: Date
        current: Date
    }
    pricing: {
        aiTokensRate: string // "1,000 tokens = 100 Credits ($0.1)"
        computeRate: string // "1 minute = 50 credits ($0.05)"
        storageRate: string // "1 GB/month = 500 credits ($0.5)"
        creditRate: string // "1 Credit = $0.001 USD"
    }
    dailyUsage: Array<{
        date: string
        aiTokens: number
        compute: number
        storage: number
        total: number
    }>
    isOverLimit: boolean
    upcomingInvoice?: {
        amount: number
        currency: string
        dueDate?: Date
        periodStart?: Date
        periodEnd?: Date
        lineItems?: Array<{
            description: string
            amount: number
            quantity?: number
            period?: {
                start: Date
                end: Date
            }
        }>
        totalCreditsUsed?: number
    }
}

export interface CustomerStatus {
    plan: {
        type: 'Free' | 'Pro'
        status: 'active' | 'inactive'
        price: number
        billingPeriod: 'month' | 'year'
        features: string[]
        limits: {
            creditsPerMonth: number
            apiAccess: boolean
            communitySupport: boolean
            usageAnalytics: boolean
        }
    }
    usage: {
        current: number
        limit: number
        percentageUsed: number
        breakdown: {
            aiTokens: number
            compute: number
            storage: number
        }
    }
    billingPeriod: {
        start: Date
        end: Date
        daysRemaining: number
    }
    accountStatus: {
        isActive: boolean
        isTrial: boolean
        isBlocked: boolean
        blockReason?: string
    }
}

/**
 * Represents a single usage event from Langfuse trace data
 */
export interface UsageEvent {
    id: string
    userId?: string
    timestamp: string
    chatflowName?: string
    chatflowId?: string
    totalCredits: number
    tokensIn: number
    tokensOut: number
    breakdown: {
        ai_tokens: number
        compute: number
        storage: number
    }
    syncStatus: 'processed' | 'pending' | 'error'
    error?: string
    metadata?: any
}

/**
 * Response structure for the usage events endpoint
 */
export interface UsageEventsResponse {
    events: UsageEvent[]
    pagination: {
        page: number
        limit: number
        totalItems: number
        totalPages: number
    }
}

/**
 * Parameters for fetching usage events
 */
export interface GetUsageEventsParams {
    user: IUser
    userId: string
    customerId: string
    page?: number
    limit?: number
    sortBy?: string
    sortOrder?: 'asc' | 'desc'
    filter?: Record<string, any>
}
