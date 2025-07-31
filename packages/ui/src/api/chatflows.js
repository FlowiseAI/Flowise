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
    generateAgentflow
}
