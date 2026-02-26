import client from './client'

const getAllChatflows = (params) => client.get('/chatflows?type=CHATFLOW', { params })

const getAllAgentflows = (type, params) => client.get(`/chatflows?type=${type}`, { params })

const getSpecificChatflow = (id) => client.get(`/chatflows/${id}`)

const getSpecificChatflowFromPublicEndpoint = (id) => client.get(`/public-chatflows/${id}`)

const createNewChatflow = (body) => client.post(`/chatflows`, body)

const updateChatflow = (id, body) => client.put(`/chatflows/${id}`, body)

const deleteChatflow = (id) => client.delete(`/chatflows/${id}`)

const getIsChatflowStreaming = (id) => client.get(`/chatflows-streaming/${id}`)

const getAllowChatflowUploads = (id) => client.get(`/chatflows-uploads/${id}`)

const getHasChatflowChanged = (id, lastUpdatedDateTime) => client.get(`/chatflows/has-changed/${id}/${lastUpdatedDateTime}`)

const generateAgentflow = (body) => client.post(`/agentflowv2-generator/generate`, body)

// Versioning APIs
const getAllVersions = (id) => client.get(`/chatflows/${id}/versions`)

const getVersion = (id, version) => client.get(`/chatflows/${id}/versions/${version}`)

const createVersion = (id, body) => client.post(`/chatflows/${id}/versions`, body)

const updateVersion = (id, version, body) => client.put(`/chatflows/${id}/versions/${version}`, body)

const setActiveVersion = (id, version) => client.put(`/chatflows/${id}/active-version`, { version })

const deleteVersion = (id, version) => client.delete(`/chatflows/${id}/versions/${version}`)

export default {
    getAllChatflows,
    getAllAgentflows,
    getSpecificChatflow,
    getSpecificChatflowFromPublicEndpoint,
    createNewChatflow,
    updateChatflow,
    deleteChatflow,
    getIsChatflowStreaming,
    getAllowChatflowUploads,
    getHasChatflowChanged,
    generateAgentflow,
    // Versioning
    getAllVersions,
    getVersion,
    createVersion,
    updateVersion,
    setActiveVersion,
    deleteVersion
}
