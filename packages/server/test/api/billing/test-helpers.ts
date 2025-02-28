import axios from 'axios'
import { BILLING_TEST_CONFIG } from './setup'

// Helper to simulate usage events
export async function simulateUsageEvent(type: 'token' | 'compute' | 'storage', amount: number) {
    return axios.post(
        `${BILLING_TEST_CONFIG.API_URL}/api/v1/billing/usage/track`,
        { type, amount },
        { headers: BILLING_TEST_CONFIG.headers }
    )
}

// Helper to get current usage stats
export async function getCurrentUsageStats() {
    const response = await axios.get(`${BILLING_TEST_CONFIG.API_URL}/api/v1/billing/usage/stats`, {
        headers: BILLING_TEST_CONFIG.headers
    })
    return {
        total_sparks: response.data.total_sparks || 0,
        usageByMeter: response.data.usageByMeter || {},
        dailyUsageByMeter: response.data.dailyUsageByMeter || {},
        lastUpdated: response.data.lastUpdated,
        raw: response.data.raw || {}
    }
}

// Helper to get customer status
export async function getCustomerStatus() {
    const response = await axios.get(`${BILLING_TEST_CONFIG.API_URL}/api/v1/billing/customer/status`, {
        headers: BILLING_TEST_CONFIG.headers
    })
    return response.data
}

// Helper to track usage
export async function trackUsage(type: 'ai_tokens' | 'compute' | 'storage', amount: number) {
    const response = await axios.post(
        `${BILLING_TEST_CONFIG.API_URL}/api/v1/billing/usage/track`,
        {
            type,
            amount,
            metadata: {
                source: 'test',
                timestamp: new Date().toISOString()
            }
        },
        { headers: BILLING_TEST_CONFIG.headers }
    )
    return response.data
}

// Helper to simulate multiple usage events
export async function simulateBulkUsage(events: Array<{ type: 'ai_tokens' | 'compute' | 'storage'; amount: number }>) {
    return Promise.all(events.map((event) => trackUsage(event.type, event.amount)))
}

// Helper to wait for usage to be recorded
export async function waitForUsageSync(timeoutMs = 1000) {
    await new Promise((resolve) => setTimeout(resolve, timeoutMs))
}

// Helper to check if usage is within limits
export function isWithinLimits(usage: number, limit: number) {
    return usage <= limit
}

// Helper to calculate expected sparks
export function calculateExpectedSparks(type: 'ai_tokens' | 'compute' | 'storage', amount: number) {
    const conversionRates = {
        ai_tokens: 10, // 1000 tokens = 100 sparks
        compute: 50, // 1 minute = 50 sparks
        storage: 500 // 1 GB = 500 sparks
    }
    return amount * conversionRates[type]
}

// Helper to get subscription details
export async function getSubscriptionDetails() {
    const response = await axios.get(`${BILLING_TEST_CONFIG.API_URL}/api/v1/billing/subscriptions`, {
        headers: BILLING_TEST_CONFIG.headers
    })
    return {
        subscription: response.data.subscription || null,
        usage: response.data.usage || []
    }
}

// Helper to make a prediction request
export async function makePredictionRequest(
    config = {
        question: 'Test question',
        chatType: 'ANSWERAI',
        socketIOClientId: 'test-socket-id'
    }
) {
    return axios.post(
        `${BILLING_TEST_CONFIG.API_URL}/api/v1/prediction`,
        {
            question: config.question,
            history: [],
            chatType: config.chatType,
            socketIOClientId: config.socketIOClientId
        },
        {
            headers: BILLING_TEST_CONFIG.headers
        }
    )
}

// Helper to simulate credit usage through predictions
export async function simulateCreditsUsage(amount: number) {
    const batchSize = 100
    const batches = Math.ceil(amount / batchSize)

    for (let i = 0; i < batches; i++) {
        const currentBatch = Math.min(batchSize, amount - i * batchSize)
        await trackUsage('ai_tokens', currentBatch)
        await waitForUsageSync(100) // Short wait between batches
    }
}
