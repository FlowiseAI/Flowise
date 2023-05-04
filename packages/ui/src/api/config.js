import client from './client'

const getConfig = (id) => client.get(`/flow-config/${id}`)

export default {
    getConfig
}
