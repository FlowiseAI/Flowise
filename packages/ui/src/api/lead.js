import client from './client'

const getLeads = (id) => client.get(`/leads/${id}`)
const addLead = (body) => client.post(`/leads/`, body)

export default {
    getLeads,
    addLead
}
