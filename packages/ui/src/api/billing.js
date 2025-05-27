import client from './client'

// usage reporting endpoints
const getUsageSummary = () => client.get('/billing/usage/summary')
const getUsageEvents = (params) => client.get('/billing/usage/events', { params })

// subscription management
const createSubscription = (body) => client.post('/billing/subscriptions', body)

export default {
    getUsageEvents,
    getUsageSummary,
    createSubscription
}
