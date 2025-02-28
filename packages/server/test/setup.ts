import dotenv from 'dotenv'
import path from 'path'

// Load test environment variables
dotenv.config({ path: path.join(__dirname, 'api', 'billing', 'test.env') })

// Set default timeout for all tests
jest.setTimeout(30000)

// Set default port for tests if not specified
process.env.PORT = process.env.PORT || '4000'

// Export test configuration for reuse
export const TEST_CONFIG = {
    API_URL: process.env.API_URL || `http://localhost:${process.env.PORT}`,
    STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY,
    STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET,
    STRIPE_PRICE_ID: process.env.STRIPE_PRICE_ID,
    LANGFUSE_PUBLIC_KEY: process.env.LANGFUSE_PUBLIC_KEY,
    LANGFUSE_SECRET_KEY: process.env.LANGFUSE_SECRET_KEY
}

// Mock console.error to avoid noise in test output
console.error = jest.fn()
