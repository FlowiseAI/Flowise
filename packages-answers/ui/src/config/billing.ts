// Constants for billing calculations
const CREDIT_PRICE_USD = 0.00004 // $20 for 500k credits
const PRO_PLAN_CREDITS = 500000 // 500k credits for Pro plan
const FREE_PLAN_CREDITS = 10000 // 10k credits for Free plan

export const BILLING_CONFIG = {
    // Base rate: $20 for 500,000 credits = $0.00004 per credit
    CREDIT_TO_USD: CREDIT_PRICE_USD,

    // Plan limits
    PLAN_LIMITS: {
        PRO: PRO_PLAN_CREDITS,
        FREE: FREE_PLAN_CREDITS
    },

    RATES: {
        AI_TOKENS: {
            UNIT: 1000,
            CREDITS: 100,
            COST: 100 * CREDIT_PRICE_USD // $0.004 for 1000 tokens
        },
        COMPUTE: {
            UNIT: 1, // minutes
            CREDITS: 50,
            COST: 50 * CREDIT_PRICE_USD // $0.002 per minute
        },
        STORAGE: {
            UNIT: 1, // GB per month
            CREDITS: 500,
            COST: 500 * CREDIT_PRICE_USD // $0.02 per GB
        }
    },

    RATE_DESCRIPTIONS: {
        AI_TOKENS: 'Usage from AI model token consumption (1,000 tokens = 100 Credits)',
        COMPUTE: 'Usage from processing time and compute resources (1 minute = 50 Credits)',
        STORAGE: 'Usage from data storage and persistence (1 GB/month = 500 Credits)'
    }
}

export const STRIPE_PRICE_IDS = {
    FREE: 'price_free',
    STANDARD: 'price_standard',
    ENTERPRISE: 'price_enterprise'
} as const

export type PricingTierName = 'Free' | 'Standard' | 'Enterprise'

export interface BillingPlan {
    id: string
    name: PricingTierName
    priceId: string
    description: string
    features: string[]
    creditsIncluded: number
    pricePerMonth: number
    highlighted?: boolean
}
