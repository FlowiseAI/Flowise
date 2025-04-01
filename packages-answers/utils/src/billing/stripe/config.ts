import Stripe from 'stripe'

// Initialize Stripe client
export const stripe = new Stripe(process.env.BILLING_STRIPE_SECRET_KEY!)

// Stripe-specific billing configuration
export const STRIPE_CONFIG = {
    CREDIT_TO_USD: 0.0001, // Cost per credit in USD

    // Single meter for total credits
    CREDITS: {
        METER_ID: 'mtr_test_61S7tgODE3yzFip9Q41FeRAHyP6byJRI',
        METER_NAME: 'credits',
        BASE_PRICE_USD: 0.0001,
        MARGIN_MULTIPLIER: 1.3 // 30% margin
    },

    // Legacy meters configuration
    METERS: {
        AI_TOKENS: {
            METER_ID: 'mtr_test_61S7tgODE3yzFip9Q41FeRAHyP6byJRI',
            TOKENS_PER_CREDIT: 10,
            BASE_PRICE_USD: 0.001,
            MARGIN_MULTIPLIER: 1.2,
            METER_NAME: 'AI Token Usage'
        },
        COMPUTE: {
            MINUTES_PER_CREDIT: 1 / 50,
            BASE_PRICE_USD: 0.001,
            MARGIN_MULTIPLIER: 1.2,
            METER_NAME: 'Compute Usage'
        },
        STORAGE: {
            GB_PER_CREDIT: 1 / 500,
            BASE_PRICE_USD: 0.001,
            MARGIN_MULTIPLIER: 1.2,
            METER_NAME: 'Storage Usage'
        }
    },

    RATE_DESCRIPTIONS: {
        AI_TOKENS: 'Usage from AI model token consumption (1,000 tokens = 100 Credits)',
        COMPUTE: 'Usage from processing time and compute resources (1 minute = 50 Credits)',
        STORAGE: 'Usage from data storage and persistence (1 GB/month = 500 Credits)'
    },

    DEFAULT_SUBSCRIPTION: {
        LIMITS: {
            AI_TOKENS: 1000000,
            COMPUTE: 10000,
            STORAGE: 100
        }
    }
}
