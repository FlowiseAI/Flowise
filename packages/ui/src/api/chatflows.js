import client from './client'

const getAllChatflows = () => client.get('/chatflows?type=CHATFLOW')

const getAllAgentflows = () => client.get('/chatflows?type=MULTIAGENT')

const getAllPublicChatflows = () => client.get('/chatflows/public/all?type=CHATFLOW')

const getAllPublicAgentflows = () => client.get('/chatflows/public/all?type=MULTIAGENT')

const getAllChatflowsOfAdmin = () => client.get('/chatflows/admin/all?type=CHATFLOW')

const getAllAgentflowsOfAdmin = () => client.get('/chatflows/admin/all?type=MULTIAGENT')

const getAllChatflowsOfAdminGroup = (groupname) => client.get(`/chatflows/admin/group?type=CHATFLOW&groupname=${groupname}`)

const getAllAgentOfAdminGroup = (groupname) => client.get(`/chatflows/admin/group?type=MULTIAGENT&groupname=${groupname}`)

const getSpecificChatflow = (id) => client.get(`/chatflows/${id}`)

const getSpecificChatflowFromPublicEndpoint = (id) => client.get(`/public-chatflows/${id}`)

const createNewChatflow = (body) => client.post(`/chatflows`, body)

const importChatflows = (body) => client.post(`/chatflows/importchatflows`, body)

const updateChatflow = (id, body) => client.put(`/chatflows/${id}`, body)

const deleteChatflow = (id) => client.delete(`/chatflows/${id}`)

const getIsChatflowStreaming = (id) => client.get(`/chatflows-streaming/${id}`)

const getAllowChatflowUploads = (id) => client.get(`/chatflows-uploads/${id}`)

export default {
  getAllChatflows,
  getAllAgentflows,
  getSpecificChatflow,
  getSpecificChatflowFromPublicEndpoint,
  createNewChatflow,
  getAllPublicAgentflows,
  importChatflows,
  updateChatflow,
  deleteChatflow,
  getIsChatflowStreaming,
  getAllowChatflowUploads,
  getAllPublicChatflows,
  getAllChatflowsOfAdmin,
  getAllAgentflowsOfAdmin,
  getAllChatflowsOfAdminGroup,
  getAllAgentOfAdminGroup
}
