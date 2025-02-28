import axios from 'axios'
import { BILLING_TEST_CONFIG } from './setup'
import {
    trackUsage,
    getCurrentUsageStats,
    getCustomerStatus,
    simulateBulkUsage,
    waitForUsageSync,
    isWithinLimits,
    calculateExpectedSparks,
    getSubscriptionDetails,
    simulateCreditsUsage,
    makePredictionRequest
} from './test-helpers'

// Use a hardcoded bearer token for testing
const TEST_AUTH_TOKEN = 'o5ruFiTnNqoPHmA72_2VdEuwBuBpORHK6lVM11eGTEk'

describe('Billing Integration Tests', () => {
    // Test timeouts and retries
    jest.setTimeout(30000)
    const MAX_RETRIES = 3
    const RETRY_DELAY = 1000

    describe('Customer Management', () => {
        it('should get detailed customer status', async () => {
            const response = await axios.get(`${BILLING_TEST_CONFIG.API_URL}/api/v1/billing/customer/status`, {
                headers: BILLING_TEST_CONFIG.headers
            })

            expect(response.status).toBe(200)
            const status = response.data

            // Customer info validation
            expect(status.customerId).toBeDefined()
            expect(status.email).toBeDefined()

            // Subscription validation
            if (status.subscription) {
                expect(status.subscription).toMatchObject({
                    id: expect.any(String),
                    status: expect.stringMatching(/^(active|canceled|past_due|trialing|incomplete)$/),
                    plan: {
                        id: expect.any(String),
                        name: expect.any(String),
                        amount: expect.any(Number),
                        currency: expect.any(String),
                        interval: expect.stringMatching(/^(month|year)$/)
                    },
                    currentPeriodStart: expect.any(String),
                    currentPeriodEnd: expect.any(String),
                    cancelAtPeriodEnd: expect.any(Boolean)
                })
            }

            // Usage validation
            expect(status.usage).toMatchObject({
                total_sparks: expect.any(Number),
                remaining_sparks: expect.any(Number),
                usageByMeter: expect.any(Object),
                lastUpdated: expect.any(String)
            })

            // Payment methods validation
            expect(status.paymentMethods).toMatchObject({
                hasValidPaymentMethod: expect.any(Boolean)
            })

            // Account status validation
            expect(status.accountStatus).toMatchObject({
                isActive: expect.any(Boolean),
                isTrial: expect.any(Boolean),
                isBlocked: expect.any(Boolean)
            })
        })

        it('should handle non-existent customer', async () => {
            const invalidHeaders = {
                ...BILLING_TEST_CONFIG.headers,
                Authorization: 'Bearer invalid_token'
            }

            try {
                await axios.get(`${BILLING_TEST_CONFIG.API_URL}/api/v1/billing/customer/status`, { headers: invalidHeaders })
                fail('Should not succeed with invalid token')
            } catch (error: any) {
                expect(error.response.status).toBe(401)
                expect(error.response.data.error).toBeDefined()
            }
        })

        it('should reflect subscription changes in customer status', async () => {
            // Get initial status
            const initialResponse = await axios.get(`${BILLING_TEST_CONFIG.API_URL}/api/v1/billing/customer/status`, {
                headers: BILLING_TEST_CONFIG.headers
            })

            // Track some usage
            await trackUsage('ai_tokens', 100)
            await waitForUsageSync()

            // Get updated status
            const updatedResponse = await axios.get(`${BILLING_TEST_CONFIG.API_URL}/api/v1/billing/customer/status`, {
                headers: BILLING_TEST_CONFIG.headers
            })

            expect(updatedResponse.data.usage.total_sparks).toBeGreaterThan(initialResponse.data.usage.total_sparks)
            expect(updatedResponse.data.usage.remaining_sparks).toBeLessThan(initialResponse.data.usage.remaining_sparks)
        })
    })

    // describe('Usage Tracking', () => {
    //     it('should track and retrieve usage', async () => {
    //         // Get initial stats
    //         const initialStats = await getCurrentUsageStats()
    //         const initialTotal = initialStats.total_sparks || 0

    //         // Track some usage
    //         const usageAmount = 100
    //         await trackUsage('ai_tokens', usageAmount)
    //         await waitForUsageSync()

    //         // Get updated stats
    //         const updatedStats = await getCurrentUsageStats()
    //         const expectedSparks = calculateExpectedSparks('ai_tokens', usageAmount)

    //         expect(updatedStats.total_sparks).toBe(initialTotal + expectedSparks)
    //         expect(updatedStats.usageByMeter).toHaveProperty('ai_tokens')
    //     })

    //     it('should handle concurrent usage tracking', async () => {
    //         const events = [
    //             { type: 'ai_tokens' as const, amount: 10 },
    //             { type: 'compute' as const, amount: 1 },
    //             { type: 'storage' as const, amount: 0.1 }
    //         ]

    //         const results = await simulateBulkUsage(events)
    //         expect(results).toHaveLength(3)

    //         await waitForUsageSync()
    //         const stats = await getCurrentUsageStats()
    //         expect(stats.total_sparks).toBeGreaterThan(0)
    //     })

    //     it('should enforce usage limits', async () => {
    //         const status = await getCustomerStatus()
    //         const limit = status.tier === 'free' ? 10000 : 250_000

    //         try {
    //             await trackUsage('ai_tokens', limit + 100)
    //             throw new Error('Should not allow exceeding limit')
    //         } catch (error: any) {
    //             expect(error.response.status).toBe(403)
    //             expect(error.response.data.error).toBe('usage_limit_exceeded')
    //         }
    //     })
    // })

    // describe('Subscription Management', () => {
    //     it('should get subscription details', async () => {
    //         const details = await getSubscriptionDetails()

    //         if (details.subscription) {
    //             expect(details.subscription).toHaveProperty('id')
    //             expect(details.subscription).toHaveProperty('status')
    //             expect(['active', 'trialing', 'canceled', 'unpaid']).toContain(details.subscription.status)
    //         }

    //         expect(Array.isArray(details.usage)).toBe(true)
    //     })

    //     it('should calculate usage costs correctly', async () => {
    //         // Track some usage
    //         const events = [
    //             { type: 'ai_tokens' as const, amount: 1000 }, // 100 sparks
    //             { type: 'compute' as const, amount: 10 }, // 500 sparks
    //             { type: 'storage' as const, amount: 1 } // 500 sparks
    //         ]

    //         await simulateBulkUsage(events)
    //         await waitForUsageSync()

    //         const stats = await getCurrentUsageStats()
    //         const expectedTotal = events.reduce((total, event) => total + calculateExpectedSparks(event.type, event.amount), 0)

    //         expect(stats.total_sparks).toBe(expectedTotal)
    //     })
    // })

    // describe('Error Handling', () => {
    //     it('should handle invalid usage data', async () => {
    //         const invalidScenarios = [
    //             { type: 'ai_tokens' as const, amount: -1 },
    //             { type: 'ai_tokens' as const, amount: 0 },
    //             { type: 'compute' as const, amount: -10 }
    //         ]

    //         for (const scenario of invalidScenarios) {
    //             try {
    //                 await trackUsage(scenario.type, scenario.amount)
    //                 throw new Error('Should not accept invalid amount')
    //             } catch (error: any) {
    //                 expect(error.response.status).toBe(400)
    //             }
    //         }
    //     })

    //     it('should handle authentication errors', async () => {
    //         try {
    //             await axios.get(`${BILLING_TEST_CONFIG.API_URL}/api/v1/billing/usage/stats`)
    //             throw new Error('Should require authentication')
    //         } catch (error: any) {
    //             expect(error.response.status).toBe(401)
    //         }
    //     })
    // })

    // describe('Usage Stats', () => {
    //     it('should get usage statistics', async () => {
    //         try {
    //             const response = await axios.get(`${BILLING_TEST_CONFIG.API_URL}/api/v1/billing/usage/stats`, {
    //                 headers: BILLING_TEST_CONFIG.headers
    //             })
    //             expect(response.status).toBe(200)
    //             expect(response.data).toHaveProperty('total_sparks')
    //             expect(response.data).toHaveProperty('usageByMeter')
    //             expect(response.data).toHaveProperty('dailyUsageByMeter')
    //             expect(response.data).toHaveProperty('lastUpdated')
    //             expect(response.data.raw).toHaveProperty('summaries')
    //             expect(response.data.raw).toHaveProperty('meterUsage')
    //         } catch (error: any) {
    //             expect(error).toBeNull()
    //         }
    //     })

    //     it('should track credit usage from predictions', async () => {
    //         try {
    //             // Get initial stats
    //             const initialStats = await axios.get(`${BILLING_TEST_CONFIG.API_URL}/api/v1/billing/usage/stats`, {
    //                 headers: BILLING_TEST_CONFIG.headers
    //             })

    //             // Make a prediction request
    //             const predictionResponse = await makePredictionRequest()
    //             expect(predictionResponse.status).toBe(200)

    //             // Wait for usage to be recorded
    //             await new Promise((resolve) => setTimeout(resolve, 1000))

    //             // Check updated stats
    //             const updatedStats = await axios.get(`${BILLING_TEST_CONFIG.API_URL}/api/v1/billing/usage/stats`, {
    //                 headers: BILLING_TEST_CONFIG.headers
    //             })
    //             expect(updatedStats.data.total_sparks).toBeGreaterThan(initialStats.data.total_sparks)
    //         } catch (error: any) {
    //             expect(error).toBeNull()
    //         }
    //     })
    // })

    // describe('Subscription Management', () => {
    //     it('should create a checkout session', async () => {
    //         try {
    //             const response = await axios.post(
    //                 `${BILLING_TEST_CONFIG.API_URL}/api/v1/billing/subscriptions`,
    //                 {
    //                     priceId: process.env.STRIPE_PRICE_ID || 'price_test'
    //                 },
    //                 { headers: BILLING_TEST_CONFIG.headers }
    //             )
    //             expect(response.status).toBe(200)
    //             expect(response.data).toHaveProperty('url')
    //             expect(response.data.url).toMatch(/^https:\/\/checkout\.stripe\.com/)
    //         } catch (error: any) {
    //             expect(error).toBeNull()
    //         }
    //     })

    //     it('should get subscription with usage', async () => {
    //         try {
    //             const response = await axios.get(`${BILLING_TEST_CONFIG.API_URL}/api/v1/billing/subscriptions`, {
    //                 headers: BILLING_TEST_CONFIG.headers
    //             })
    //             expect(response.status).toBe(200)
    //             if (response.data.subscription) {
    //                 expect(response.data).toHaveProperty('id')
    //                 expect(response.data).toHaveProperty('status')
    //                 expect(response.data).toHaveProperty('currentPeriodStart')
    //                 expect(response.data).toHaveProperty('currentPeriodEnd')
    //                 expect(response.data).toHaveProperty('usage')
    //             }
    //         } catch (error: any) {
    //             expect(error).toBeNull()
    //         }
    //     })
    // })

    // describe('Billing Portal', () => {
    //     it('should create a billing portal session', async () => {
    //         try {
    //             const response = await axios.post(
    //                 `${BILLING_TEST_CONFIG.API_URL}/api/v1/billing/portal-sessions`,
    //                 {
    //                     returnUrl: `${BILLING_TEST_CONFIG.API_URL}/billing`
    //                 },
    //                 { headers: BILLING_TEST_CONFIG.headers }
    //             )
    //             expect(response.status).toBe(200)
    //             expect(response.data).toHaveProperty('url')
    //             expect(response.data.url).toMatch(/^https:\/\/billing\.stripe\.com/)
    //         } catch (error: any) {
    //             expect(error).toBeNull()
    //         }
    //     })
    // })

    // describe('Free Tier Management', () => {
    //     it('should track free tier usage correctly', async () => {
    //         try {
    //             // First check initial credits
    //             const initialStats = await axios.get(`${BILLING_TEST_CONFIG.API_URL}/api/v1/billing/usage/stats`, {
    //                 headers: BILLING_TEST_CONFIG.headers
    //             })
    //             expect(initialStats.data.total_sparks).toBeDefined()

    //             // Use credits through predictions
    //             await simulateCreditsUsage(5000) // Use about half of free tier

    //             // Wait for usage to be recorded
    //             await new Promise((resolve) => setTimeout(resolve, 1000))

    //             // Check updated stats
    //             const updatedStats = await axios.get(`${BILLING_TEST_CONFIG.API_URL}/api/v1/billing/usage/stats`, {
    //                 headers: BILLING_TEST_CONFIG.headers
    //             })
    //             expect(updatedStats.data.total_sparks).toBeGreaterThan(initialStats.data.total_sparks)
    //             expect(updatedStats.data.total_sparks).toBeLessThanOrEqual(BILLING_TEST_CONFIG.freeTierCredits)
    //         } catch (error: any) {
    //             expect(error).toBeNull()
    //         }
    //     })

    //     it('should notify when approaching free tier limit', async () => {
    //         try {
    //             // Use most of free tier through predictions
    //             await simulateCreditsUsage(9000) // Use 90% of free tier

    //             // Wait for usage to be recorded
    //             await new Promise((resolve) => setTimeout(resolve, 1000))

    //             // Make one more prediction to trigger warning
    //             const response = await makePredictionRequest()
    //             expect(response.data).toHaveProperty('warnings')
    //             expect(response.data.warnings).toContain('approaching_free_tier_limit')
    //         } catch (error: any) {
    //             expect(error).toBeNull()
    //         }
    //     })
    // })

    // describe('Hard Limit Implementation', () => {
    //     it('should enforce hard limit', async () => {
    //         try {
    //             // Attempt to exceed hard limit through predictions
    //             await simulateCreditsUsage(BILLING_TEST_CONFIG.hardLimitCredits + 1000)

    //             // This prediction should fail
    //             await expect(makePredictionRequest()).rejects.toThrow()
    //         } catch (error: any) {
    //             expect(error.response.status).toBe(403)
    //             expect(error.response.data).toHaveProperty('error', 'usage_limit_exceeded')
    //         }
    //     })

    //     it('should handle blocking mechanism', async () => {
    //         try {
    //             // Get close to limit
    //             await simulateCreditsUsage(BILLING_TEST_CONFIG.hardLimitCredits - 10000)

    //             // Wait for usage to be recorded
    //             await new Promise((resolve) => setTimeout(resolve, 1000))

    //             // Check blocking status
    //             const statusResponse = await axios.get(`${BILLING_TEST_CONFIG.API_URL}/api/v1/billing/usage/status`, {
    //                 headers: BILLING_TEST_CONFIG.headers
    //             })
    //             expect(statusResponse.data).toHaveProperty('isBlocked', false)
    //             expect(statusResponse.data).toHaveProperty('warnings')
    //             expect(statusResponse.data.warnings).toContain('approaching_hard_limit')

    //             // Should still allow predictions
    //             const predictionResponse = await makePredictionRequest()
    //             expect(predictionResponse.status).toBe(200)
    //         } catch (error: any) {
    //             expect(error).toBeNull()
    //         }
    //     })
    // })

    // describe('Usage Dashboard', () => {
    //     it('should return detailed usage breakdown by resource type', async () => {
    //         try {
    //             const response = await axios.get(`${BILLING_TEST_CONFIG.API_URL}/api/v1/billing/usage/stats`, {
    //                 headers: BILLING_TEST_CONFIG.headers
    //             })
    //             expect(response.status).toBe(200)

    //             // Resource type breakdown
    //             expect(response.data.usageByMeter).toHaveProperty('ai_tokens')
    //             expect(response.data.usageByMeter).toHaveProperty('compute')
    //             expect(response.data.usageByMeter).toHaveProperty('storage')

    //             // Check rates and limits
    //             expect(response.data.rates).toEqual({
    //                 ai_tokens: 10.0,
    //                 compute: 0.02,
    //                 storage: 5.0
    //             })

    //             // Check resource limits
    //             expect(response.data.limits).toEqual({
    //                 ai_tokens: 1000000,
    //                 compute: 10000,
    //                 storage: 100
    //             })

    //             // Check billing period
    //             expect(response.data).toHaveProperty('billingPeriod')
    //             expect(response.data.billingPeriod).toHaveProperty('start')
    //             expect(response.data.billingPeriod).toHaveProperty('end')
    //         } catch (error: any) {
    //             expect(error).toBeNull()
    //         }
    //     })

    //     it('should track daily usage for each resource type', async () => {
    //         try {
    //             const response = await axios.get(`${BILLING_TEST_CONFIG.API_URL}/api/v1/billing/usage/stats`, {
    //                 headers: BILLING_TEST_CONFIG.headers
    //             })
    //             expect(response.status).toBe(200)

    //             // Check daily usage structure
    //             expect(response.data.dailyUsageByMeter).toHaveProperty('ai_tokens')
    //             expect(response.data.dailyUsageByMeter.ai_tokens).toBeInstanceOf(Array)
    //             expect(response.data.dailyUsageByMeter.ai_tokens[0]).toHaveProperty('date')
    //             expect(response.data.dailyUsageByMeter.ai_tokens[0]).toHaveProperty('value')
    //             expect(response.data.dailyUsageByMeter.ai_tokens[0]).toHaveProperty('cost')
    //         } catch (error: any) {
    //             expect(error).toBeNull()
    //         }
    //     })
    // })

    // describe('Plan Management', () => {
    //     it('should return current plan details', async () => {
    //         try {
    //             const response = await axios.get(`${BILLING_TEST_CONFIG.API_URL}/api/v1/billing/plan`, {
    //                 headers: BILLING_TEST_CONFIG.headers
    //             })
    //             expect(response.status).toBe(200)

    //             // Plan details
    //             expect(response.data).toHaveProperty('name')
    //             expect(response.data).toHaveProperty('price')
    //             expect(response.data).toHaveProperty('status')
    //             expect(response.data).toHaveProperty('features')
    //             expect(response.data).toHaveProperty('credits_included')

    //             // Basic plan structure
    //             if (response.data.name === 'Basic') {
    //                 expect(response.data.price).toBe(0)
    //                 expect(response.data.credits_included).toBe(10000)
    //             }

    //             // Pro plan structure
    //             if (response.data.name === 'Pro') {
    //                 expect(response.data.price).toBe(99)
    //                 expect(response.data.credits_included).toBe(250_000)
    //             }

    //             // Common features
    //             expect(response.data.features).toContain('Full API access')
    //             expect(response.data.features).toContain('Community support')
    //             expect(response.data.features).toContain('All features included')
    //             expect(response.data.features).toContain('Usage analytics')
    //         } catch (error: any) {
    //             expect(error).toBeNull()
    //         }
    //     })

    //     it('should handle plan upgrade', async () => {
    //         try {
    //             const response = await axios.post(
    //                 `${BILLING_TEST_CONFIG.API_URL}/api/v1/billing/plan/upgrade`,
    //                 { plan: 'pro' },
    //                 { headers: BILLING_TEST_CONFIG.headers }
    //             )
    //             expect(response.status).toBe(200)
    //             expect(response.data).toHaveProperty('checkout_url')
    //             expect(response.data.checkout_url).toMatch(/^https:\/\/checkout\.stripe\.com/)
    //         } catch (error: any) {
    //             expect(error).toBeNull()
    //         }
    //     })

    //     it('should return cost calculator estimates', async () => {
    //         try {
    //             const response = await axios.post(
    //                 `${BILLING_TEST_CONFIG.API_URL}/api/v1/billing/calculate-cost`,
    //                 {
    //                     ai_tokens: 1000,
    //                     compute_minutes: 60,
    //                     storage_gb: 1
    //                 },
    //                 { headers: BILLING_TEST_CONFIG.headers }
    //             )
    //             expect(response.status).toBe(200)
    //             expect(response.data).toHaveProperty('total_cost')
    //             expect(response.data).toHaveProperty('breakdown')
    //             expect(response.data.breakdown).toHaveProperty('ai_tokens')
    //             expect(response.data.breakdown).toHaveProperty('compute')
    //             expect(response.data.breakdown).toHaveProperty('storage')
    //             expect(response.data).toHaveProperty('total_sparks')
    //         } catch (error: any) {
    //             expect(error).toBeNull()
    //         }
    //     })
    // })
})
