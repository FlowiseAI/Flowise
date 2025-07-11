import client from './client'

const getFlowVersions = (id) => client.get(`/flow-version/${id}/versions`)
const publishFlow = (id, message) => client.post(`/flow-version/${id}/publish`, { message: message || 'Publish from Flowise' })
const makeDraft = (id, commitId) => client.put(`/flow-version/${id}/make-draft/${commitId}`)
const check = () => client.get(`/flow-version/check`)

export default {
    getFlowVersions,
    publishFlow,
    makeDraft,
    check
}
