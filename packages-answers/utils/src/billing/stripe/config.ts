import Stripe from 'stripe'

// Initialize Stripe client
export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)

// Stripe-specific billing configuration
export const STRIPE_CONFIG = {
    SPARK_TO_USD: 0.0001, // Cost per spark in USD

    // Single meter for total sparks
    SPARKS: {
        METER_ID: 'mtr_test_61RqbeVr5wxWsemTV41FeRAHyP6byAfw',
        METER_NAME: 'sparks',
        BASE_PRICE_USD: 0.0001,
        MARGIN_MULTIPLIER: 1.3 // 30% margin
    },

    // Legacy meters configuration
    METERS: {
        AI_TOKENS: {
            METER_ID: 'mtr_test_61RqbeVr5wxWsemTV41FeRAHyP6byAfw',
            TOKENS_PER_SPARK: 10,
            BASE_PRICE_USD: 0.001,
            MARGIN_MULTIPLIER: 1.2,
            METER_NAME: 'AI Token Usage'
        },
        COMPUTE: {
            MINUTES_PER_SPARK: 1 / 50,
            BASE_PRICE_USD: 0.001,
            MARGIN_MULTIPLIER: 1.2,
            METER_NAME: 'Compute Usage'
        },
        STORAGE: {
            GB_PER_SPARK: 1 / 500,
            BASE_PRICE_USD: 0.001,
            MARGIN_MULTIPLIER: 1.2,
            METER_NAME: 'Storage Usage'
        }
    },

    RATE_DESCRIPTIONS: {
        AI_TOKENS: 'Usage from AI model token consumption (1,000 tokens = 100 Sparks)',
        COMPUTE: 'Usage from processing time and compute resources (1 minute = 50 Sparks)',
        STORAGE: 'Usage from data storage and persistence (1 GB/month = 500 Sparks)'
    },

    DEFAULT_SUBSCRIPTION: {
        LIMITS: {
            AI_TOKENS: 1000000,
            COMPUTE: 10000,
            STORAGE: 100
        }
    }
}
