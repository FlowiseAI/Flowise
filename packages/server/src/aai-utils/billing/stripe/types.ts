import type Stripe from 'stripe'

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

export interface MeterEventSummary extends Stripe.Billing.MeterEventSummary {
    metadata?: string
    payload?: {
        credit_type?: string
        value?: string
        [key: string]: any
    }
}
