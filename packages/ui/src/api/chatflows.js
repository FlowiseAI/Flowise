import client from './client'

const getAllChatflows = () => client.get('/chatflows?type=CHATFLOW')

const getAdminChatflows = (filter, type = 'CHATFLOW') => {
    const params = new URLSearchParams()
    params.append('type', type)
    if (filter) {
        params.append('filter', JSON.stringify(filter))
    }
    return client.get(`/admin/chatflows?${params.toString()}`)
}

const getAllAgentflows = (type) => client.get(`/chatflows?type=${type}`)

const getSpecificChatflow = (id) => client.get(`/chatflows/${id}`)

const getSpecificChatflowFromPublicEndpoint = (id) => client.get(`/public-chatflows/${id}`)

const createNewChatflow = (body) => client.post(`/chatflows`, body)

const importChatflows = (body) => client.post(`/chatflows/importchatflows`, body)

const updateChatflow = (id, body) => client.put(`/chatflows/${id}`, body)

const deleteChatflow = (id) => client.delete(`/chatflows/${id}`)

const getIsChatflowStreaming = (id) => client.get(`/chatflows-streaming/${id}`)

const getAllowChatflowUploads = (id) => client.get(`/chatflows-uploads/${id}`)

const generateAgentflow = (body) => client.post(`/agentflowv2-generator/generate`, body)

const getDefaultChatflowTemplate = () => client.get('/admin/chatflows/default-template')

const bulkUpdateChatflows = (chatflowIds) => client.put('/admin/chatflows/bulk-update', { chatflowIds })

// Versioning API methods
const getChatflowVersions = (id) => client.get(`/admin/chatflows/${id}/versions`)

const getChatflowVersion = (id, version) => client.get(`/chatflows/${id}/versions/${version}`)

const rollbackChatflowToVersion = (id, version) => client.post(`/admin/chatflows/${id}/rollback/${version}`)

export default {
    getAllChatflows,
    getAllAgentflows,
    getAdminChatflows,
    getSpecificChatflow,
    getSpecificChatflowFromPublicEndpoint,
    createNewChatflow,
    importChatflows,
    updateChatflow,
    deleteChatflow,
    getIsChatflowStreaming,
    getAllowChatflowUploads,
    generateAgentflow,
    getDefaultChatflowTemplate,
    bulkUpdateChatflows,
    getChatflowVersions,
    getChatflowVersion,
    rollbackChatflowToVersion
}
