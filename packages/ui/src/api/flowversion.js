import client from './client'

const getFlowVersions = (id) => client.get(`/flow-version/${id}/versions`)

const publishFlow = (id, message) => client.post(`/flow-version/${id}/publish`, { message: message || 'Publish from Flowise' })

export default {
    getFlowVersions,
    publishFlow
}
