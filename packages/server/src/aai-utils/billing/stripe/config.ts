import Stripe from 'stripe'
import { BILLING_CONFIG } from '../config'

// Initialize Stripe client
export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)

// Load environment variables with defaults
const CREDIT_PRICE_USD = BILLING_CONFIG.CREDIT_TO_USD // Use the same value from billing config
const MARGIN_MULTIPLIER = parseFloat(process.env.STRIPE_MARGIN_MULTIPLIER || '1.3') // 30% margin

// Stripe-specific billing configuration
export const STRIPE_CONFIG = {
    CREDIT_TO_USD: CREDIT_PRICE_USD, // Cost per credit in USD

    // Single meter for total credits
    CREDITS: {
        METER_ID: process.env.STRIPE_CREDITS_METER_ID || 'mtr_test_61S7tgODE3yzFip9Q41FeRAHyP6byJRI',
        METER_NAME: 'credits',
        BASE_PRICE_USD: CREDIT_PRICE_USD,
        MARGIN_MULTIPLIER: MARGIN_MULTIPLIER // 30% margin
    },

    // Legacy meters configuration
    METERS: {
        AI_TOKENS: {
            METER_ID: process.env.STRIPE_AI_TOKENS_METER_ID || 'mtr_test_61S7tgODE3yzFip9Q41FeRAHyP6byJRI',
            TOKENS_PER_CREDIT: BILLING_CONFIG.AI_TOKENS.TOKENS_PER_CREDIT,
            BASE_PRICE_USD: CREDIT_PRICE_USD * 10, // 10x base price for tokens
            MARGIN_MULTIPLIER: 1.2,
            METER_NAME: 'AI Token Usage'
        },
        COMPUTE: {
            MINUTES_PER_CREDIT: BILLING_CONFIG.COMPUTE.MINUTES_PER_CREDIT,
            BASE_PRICE_USD: CREDIT_PRICE_USD * 50, // 50x base price for compute
            MARGIN_MULTIPLIER: 1.2,
            METER_NAME: 'Compute Usage'
        },
        STORAGE: {
            GB_PER_CREDIT: BILLING_CONFIG.STORAGE.GB_PER_CREDIT,
            BASE_PRICE_USD: CREDIT_PRICE_USD * 500, // 500x base price for storage
            MARGIN_MULTIPLIER: 1.2,
            METER_NAME: 'Storage Usage'
        }
    },

    RATE_DESCRIPTIONS: BILLING_CONFIG.RATE_DESCRIPTIONS
}
