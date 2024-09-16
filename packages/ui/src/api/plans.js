import client from './client'

const getCurrentPlan = () => client.get(`/plan`)
const getHistoricPlans = () => client.get(`/plan/history`)

export default {
    getCurrentPlan,
    getHistoricPlans
}
