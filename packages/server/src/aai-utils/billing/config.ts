import { Logger } from 'winston'
import { Langfuse } from 'langfuse'

// Initialize logger
export const log = console as unknown as Logger

// Default customer ID for development
export const DEFAULT_CUSTOMER_ID = process.env.BILLING_DEFAULT_STRIPE_CUSTOMER_ID

// Load environment variables with defaults
const BILLING_CREDIT_PRICE_USD = parseFloat(process.env.BILLING_CREDIT_PRICE_USD || '0')
const MARGIN_MULTIPLIER = parseFloat(process.env.BILLING_MARGIN_MULTIPLIER || '1')
const BILLING_PRO_PLAN_CREDITS = parseInt(process.env.BILLING_PRO_PLAN_CREDITS || '500000')
const BILLING_FREE_PLAN_CREDITS = parseInt(process.env.BILLING_FREE_PLAN_CREDITS || '10000')

// Billing configuration
export const BILLING_CONFIG = {
    PRICE_IDS: {
        FREE_MONTHLY: process.env.STRIPE_FREE_PRICE_ID,
        PAID_MONTHLY: process.env.BILLING_STRIPE_PAID_PRICE_ID
    },
    // Base rate: $20 for 500,000 credits = $0.00004 per credit
    CREDIT_TO_USD: BILLING_CREDIT_PRICE_USD,
    MARGIN_MULTIPLIER: MARGIN_MULTIPLIER,
    BILLING_CREDITS_METER_ID: process.env.STRIPE_CREDITS_METER_ID,
    BILLING_CREDITS_METER_NAME: 'credits',

    // Plan limits
    PLAN_LIMITS: {
        PRO: BILLING_PRO_PLAN_CREDITS,
        FREE: BILLING_FREE_PLAN_CREDITS
    },

    // Validation rules
    VALIDATION: {
        MIN_BATCH_SIZE: 1,
        MAX_BATCH_SIZE: 100,
        MAX_RETRIES: 3,
        RETRY_DELAY_MS: 1000,
        BATCH_DELAY_MS: 1000
    },

    // Resource configuration
    AI_TOKENS: {
        TOKENS_PER_CREDIT: 10, // 1,000 tokens = 100 Credits
        METER_NAME: 'credits',
        MIN_TOKENS: 1,
        MAX_TOKENS_PER_REQUEST: 1000000
    },
    COMPUTE: {
        MINUTES_PER_CREDIT: 1 / 50, // 1 minute = 50 Credits
        METER_NAME: 'credits',
        MIN_MINUTES: 0.1,
        MAX_MINUTES_PER_REQUEST: 1440 // 24 hours
    },
    STORAGE: {
        GB_PER_CREDIT: 1 / 500, // 1 GB = 500 Credits
        METER_NAME: 'credits',
        MIN_GB: 0.1,
        MAX_GB_PER_REQUEST: 1000
    },

    // Usage metadata fields
    METADATA_FIELDS: {
        REQUIRED: ['customerId', 'timestamp', 'resourceType'],
        OPTIONAL: ['model', 'endpoint', 'tags']
    },

    RATE_DESCRIPTIONS: {
        AI_TOKENS: 'Usage from AI model token consumption (1,000 tokens = 100 Credits)',
        COMPUTE: 'Usage from processing time and compute resources (1 minute = 50 Credits)',
        STORAGE: 'Usage from data storage and persistence (1 GB/month = 500 Credits)'
    }
}

// Initialize Langfuse client
export const langfuse = new Langfuse({
    publicKey: process.env.LANGFUSE_PUBLIC_KEY || '',
    secretKey: process.env.LANGFUSE_SECRET_KEY || '',
    baseUrl: process.env.LANGFUSE_HOST || 'https://cloud.langfuse.com'
})
