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
    API_URL: process.env.API_URL || `http://localhost:${process.env.PORT}`
}

// You can add more global setup here as needed
// For example:
// - Database setup/teardown
// - Test data initialization
// - Mock service setup
