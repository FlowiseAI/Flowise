import axios from 'axios'
import { IUser } from '../../src/Interface'
import apikeyService from '../../src/services/apikey'

export const TEST_SERVER_URL = 'http://localhost:4000'

export interface TestUser extends IUser {
    id: string
    organizationId: string
    email: string
    name: string
}

export const createTestUser = (): TestUser => ({
    id: `test-user-${Date.now()}`,
    organizationId: `test-org-${Date.now()}`,
    email: `test${Date.now()}@example.com`,
    name: 'Test User',
    createdDate: new Date(),
    updatedDate: new Date()
})

export const createTestApiKey = async (user: TestUser) => {
    const keys = await apikeyService.createApiKey(`TestKey-${Date.now()}`, user)
    return Array.isArray(keys) ? keys[0] : keys
}

export const cleanupTestApiKey = async (apiKeyId: string, user: TestUser) => {
    await apikeyService.deleteApiKey(apiKeyId, user)
}

export const makeAuthenticatedRequest = async (endpoint: string, apiKey: string, method = 'GET', data?: any) => {
    const url = `${TEST_SERVER_URL}${endpoint}`
    const config = {
        headers: {
            Authorization: `Bearer ${apiKey}`
        }
    }

    try {
        if (method === 'GET') {
            return await axios.get(url, config)
        } else if (method === 'POST') {
            return await axios.post(url, data, config)
        } else if (method === 'PUT') {
            return await axios.put(url, data, config)
        } else if (method === 'DELETE') {
            return await axios.delete(url, config)
        }
    } catch (error: any) {
        if (error.response) {
            return error.response
        }
        throw error
    }
}
