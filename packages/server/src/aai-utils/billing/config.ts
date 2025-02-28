import Stripe from 'stripe'
import { Logger } from 'winston'
import { Langfuse } from 'langfuse'

// Initialize Stripe client
export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '')

// Initialize logger
export const log = console as unknown as Logger

// Default customer ID for development
export const DEFAULT_CUSTOMER_ID = process.env.DEFAULT_STRIPE_CUSTOMER_ID ?? 'cus_Re7UrYXnBJisB8'

// Load environment variables with defaults
const SPARK_PRICE_USD = parseFloat(process.env.SPARK_PRICE_USD || '0.00004') // $20 for 500k sparks
const MARGIN_MULTIPLIER = parseFloat(process.env.BILLING_MARGIN_MULTIPLIER || '1.2') // 20% margin
const PRO_PLAN_SPARKS = parseInt(process.env.PRO_PLAN_SPARKS || '500000') // 500k sparks for Pro plan
const FREE_PLAN_SPARKS = parseInt(process.env.FREE_PLAN_SPARKS || '10000') // 10k sparks for Free plan

// Billing configuration
export const BILLING_CONFIG = {
    PRICE_IDS: {
        FREE_MONTHLY: process.env.STRIPE_FREE_PRICE_ID || 'price_1QhDqdFeRAHyP6byOK161faI',
        PAID_MONTHLY: process.env.STRIPE_PAID_PRICE_ID || 'price_1QhDqdFeRAHyP6byOK161faI'
    },
    // Base rate: $20 for 500,000 sparks = $0.00004 per spark
    SPARK_TO_USD: SPARK_PRICE_USD,
    MARGIN_MULTIPLIER: MARGIN_MULTIPLIER,
    SPARKS_METER_ID: process.env.STRIPE_SPARKS_METER_ID || 'mtr_test_61Rgpu5M2KRrOLhJW41FeRAHyP6by5dI',
    SPARKS_METER_NAME: 'sparks',

    // Plan limits
    PLAN_LIMITS: {
        PRO: PRO_PLAN_SPARKS,
        FREE: FREE_PLAN_SPARKS
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
        TOKENS_PER_SPARK: 10, // 1,000 tokens = 100 Sparks
        METER_NAME: 'sparks',
        MIN_TOKENS: 1,
        MAX_TOKENS_PER_REQUEST: 1000000
    },
    COMPUTE: {
        MINUTES_PER_SPARK: 1 / 50, // 1 minute = 50 Sparks
        METER_NAME: 'sparks',
        MIN_MINUTES: 0.1,
        MAX_MINUTES_PER_REQUEST: 1440 // 24 hours
    },
    STORAGE: {
        GB_PER_SPARK: 1 / 500, // 1 GB = 500 Sparks
        METER_NAME: 'sparks',
        MIN_GB: 0.1,
        MAX_GB_PER_REQUEST: 1000
    },

    // Usage metadata fields
    METADATA_FIELDS: {
        REQUIRED: ['customerId', 'timestamp', 'resourceType'],
        OPTIONAL: ['model', 'endpoint', 'tags']
    },

    RATE_DESCRIPTIONS: {
        AI_TOKENS: 'Usage from AI model token consumption (1,000 tokens = 100 Sparks)',
        COMPUTE: 'Usage from processing time and compute resources (1 minute = 50 Sparks)',
        STORAGE: 'Usage from data storage and persistence (1 GB/month = 500 Sparks)'
    }
}

// Initialize Langfuse client
export const langfuse = new Langfuse({
    publicKey: process.env.LANGFUSE_PUBLIC_KEY || '',
    secretKey: process.env.LANGFUSE_SECRET_KEY || '',
    baseUrl: process.env.LANGFUSE_BASEURL || 'https://cloud.langfuse.com'
})
