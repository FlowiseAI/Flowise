import Stripe from 'stripe'
import { BILLING_CONFIG } from '../config'

// Initialize Stripe client
export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)

// Load environment variables with defaults
const SPARK_PRICE_USD = BILLING_CONFIG.SPARK_TO_USD // Use the same value from billing config
const MARGIN_MULTIPLIER = parseFloat(process.env.STRIPE_MARGIN_MULTIPLIER || '1.3') // 30% margin

// Stripe-specific billing configuration
export const STRIPE_CONFIG = {
    SPARK_TO_USD: SPARK_PRICE_USD, // Cost per spark in USD

    // Single meter for total sparks
    SPARKS: {
        METER_ID: process.env.STRIPE_SPARKS_METER_ID || 'mtr_test_61RqbeVr5wxWsemTV41FeRAHyP6byAfw',
        METER_NAME: 'sparks',
        BASE_PRICE_USD: SPARK_PRICE_USD,
        MARGIN_MULTIPLIER: MARGIN_MULTIPLIER // 30% margin
    },

    // Legacy meters configuration
    METERS: {
        AI_TOKENS: {
            METER_ID: process.env.STRIPE_AI_TOKENS_METER_ID || 'mtr_test_61RqbeVr5wxWsemTV41FeRAHyP6byAfw',
            TOKENS_PER_SPARK: BILLING_CONFIG.AI_TOKENS.TOKENS_PER_SPARK,
            BASE_PRICE_USD: SPARK_PRICE_USD * 10, // 10x base price for tokens
            MARGIN_MULTIPLIER: 1.2,
            METER_NAME: 'AI Token Usage'
        },
        COMPUTE: {
            MINUTES_PER_SPARK: BILLING_CONFIG.COMPUTE.MINUTES_PER_SPARK,
            BASE_PRICE_USD: SPARK_PRICE_USD * 50, // 50x base price for compute
            MARGIN_MULTIPLIER: 1.2,
            METER_NAME: 'Compute Usage'
        },
        STORAGE: {
            GB_PER_SPARK: BILLING_CONFIG.STORAGE.GB_PER_SPARK,
            BASE_PRICE_USD: SPARK_PRICE_USD * 500, // 500x base price for storage
            MARGIN_MULTIPLIER: 1.2,
            METER_NAME: 'Storage Usage'
        }
    },

    RATE_DESCRIPTIONS: BILLING_CONFIG.RATE_DESCRIPTIONS
}
