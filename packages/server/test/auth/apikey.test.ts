import { expect } from 'chai'
import { describe, it, before, after } from 'mocha'
import { createTestUser, createTestApiKey, cleanupTestApiKey, makeAuthenticatedRequest, TestUser } from '../utils/testHelpers'

describe('API Key Authentication Tests', () => {
    let testUser: TestUser
    let testApiKey: string
    let testApiKeyId: string

    before(async () => {
        // Create test user and API key
        testUser = createTestUser()
        const key = await createTestApiKey(testUser)
        testApiKey = key.apiKey
        testApiKeyId = key.id
    })

    after(async () => {
        // Cleanup test data
        await cleanupTestApiKey(testApiKeyId, testUser)
    })

    describe('API Key Validation', () => {
        it('should reject requests without authentication', async () => {
            const response = await makeAuthenticatedRequest('/api/v1/chatflows', '')
            expect(response.status).to.equal(401)
        })

        it('should accept valid API key', async () => {
            const response = await makeAuthenticatedRequest('/api/v1/chatflows', testApiKey)
            expect(response.status).to.equal(200)
        })

        it('should reject invalid API key', async () => {
            const response = await makeAuthenticatedRequest('/api/v1/chatflows', 'invalid-key')
            expect(response.status).to.equal(401)
        })
    })

    describe('User Context', () => {
        it('should attach correct user context with API key', async () => {
            const response = await makeAuthenticatedRequest('/api/v1/user', testApiKey)
            expect(response.status).to.equal(200)
            expect(response.data).to.have.property('id', testUser.id)
            expect(response.data).to.have.property('apiKey')
            expect(response.data.apiKey).to.have.property('id', testApiKeyId)
        })

        it('should include API key metadata in user context', async () => {
            const response = await makeAuthenticatedRequest('/api/v1/user', testApiKey)
            expect(response.status).to.equal(200)
            expect(response.data.apiKey).to.have.property('metadata')
        })
    })
})
