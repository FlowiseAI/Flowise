import client from './client'

const getConfig = (id) => client.get(`/flow-config/${id}`)
const getNodeConfig = (body) => client.post(`/node-config`, body)

export default {
    getConfig,
    getNodeConfig
}
