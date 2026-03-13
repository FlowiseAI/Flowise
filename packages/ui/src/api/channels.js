import client from './client'

const getChannelAccounts = (params = {}) => client.get('/channels/accounts', { params })
const createChannelAccount = (body) => client.post('/channels/accounts', body)
const updateChannelAccount = (id, body) => client.put(`/channels/accounts/${id}`, body)
const deleteChannelAccount = (id) => client.delete(`/channels/accounts/${id}`)

const getChannelBindings = (params = {}) => client.get('/channels/bindings', { params })
const createChannelBinding = (body) => client.post('/channels/bindings', body)
const updateChannelBinding = (id, body) => client.put(`/channels/bindings/${id}`, body)
const deleteChannelBinding = (id) => client.delete(`/channels/bindings/${id}`)

export default {
    getChannelAccounts,
    createChannelAccount,
    updateChannelAccount,
    deleteChannelAccount,
    getChannelBindings,
    createChannelBinding,
    updateChannelBinding,
    deleteChannelBinding
}
