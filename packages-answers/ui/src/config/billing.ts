// Constants for billing calculations
const SPARK_PRICE_USD = 0.00004 // $20 for 500k sparks
const PRO_PLAN_SPARKS = 500000 // 500k sparks for Pro plan
const FREE_PLAN_SPARKS = 10000 // 10k sparks for Free plan

export const BILLING_CONFIG = {
    // Base rate: $20 for 500,000 sparks = $0.00004 per spark
    SPARK_TO_USD: SPARK_PRICE_USD,

    // Plan limits
    PLAN_LIMITS: {
        PRO: PRO_PLAN_SPARKS,
        FREE: FREE_PLAN_SPARKS
    },

    RATES: {
        AI_TOKENS: {
            UNIT: 1000,
            SPARKS: 100,
            COST: 100 * SPARK_PRICE_USD // $0.004 for 1000 tokens
        },
        COMPUTE: {
            UNIT: 1, // minutes
            SPARKS: 50,
            COST: 50 * SPARK_PRICE_USD // $0.002 per minute
        },
        STORAGE: {
            UNIT: 1, // GB per month
            SPARKS: 500,
            COST: 500 * SPARK_PRICE_USD // $0.02 per GB
        }
    },

    RATE_DESCRIPTIONS: {
        AI_TOKENS: 'Usage from AI model token consumption (1,000 tokens = 100 Sparks)',
        COMPUTE: 'Usage from processing time and compute resources (1 minute = 50 Sparks)',
        STORAGE: 'Usage from data storage and persistence (1 GB/month = 500 Sparks)'
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
    sparksIncluded: number
    pricePerMonth: number
    highlighted?: boolean
}
