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

const setWebhookSecret = (id) => client.post(`/chatflows/${id}/webhook-secret`)

const clearWebhookSecret = (id) => client.delete(`/chatflows/${id}/webhook-secret`)

const getScheduleStatus = (id) => client.get(`/chatflows/${id}/schedule/status`)

const toggleScheduleEnabled = (id, enabled) => client.patch(`/chatflows/${id}/schedule/enabled`, { enabled })

const getScheduleTriggerLogs = (id, params) => client.get(`/chatflows/${id}/schedule/trigger-logs`, { params })

const deleteScheduleTriggerLogs = (id, logIds) => client.delete(`/chatflows/${id}/schedule/trigger-logs`, { data: { logIds } })

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
    setWebhookSecret,
    clearWebhookSecret,
    getScheduleStatus,
    toggleScheduleEnabled,
    getScheduleTriggerLogs,
    deleteScheduleTriggerLogs
}
