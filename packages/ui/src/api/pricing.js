import client from '@/api/client'

const getPricingPlans = (body) => client.get(`/pricing`, body)

export default {
    getPricingPlans
}
