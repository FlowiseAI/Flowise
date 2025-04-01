import dotenv from 'dotenv'
import path from 'path'

// Load environment variables from .env file
dotenv.config({ path: path.join(__dirname, '..', '..', '.env') })

// Set default timeout for all tests
jest.setTimeout(30000)

// Set default port for tests if not specified
process.env.PORT = process.env.PORT || '4000'

// Export test configuration for reuse
export const TEST_CONFIG = {
    API_URL: process.env.API_URL || 'http://localhost:4000',
    PORT: 4000,
    USERNAME: 'admin',
    PASSWORD: 'admin',
    BILLING_STRIPE_SECRET_KEY: process.env.BILLING_STRIPE_SECRET_KEY,
    BILLING_STRIPE_WEBHOOK_SECRET: process.env.BILLING_STRIPE_WEBHOOK_SECRET,
    STRIPE_PRICE_ID: process.env.STRIPE_PRICE_ID,
    LANGFUSE_PUBLIC_KEY: process.env.LANGFUSE_PUBLIC_KEY,
    LANGFUSE_SECRET_KEY: process.env.LANGFUSE_SECRET_KEY
}

// You can add more global setup here as needed
// For example:
// - Database setup/teardown
// - Test data initialization
// - Mock service setup
