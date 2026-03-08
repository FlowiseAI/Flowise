import client from './client'

const getMcpServerConfig = (id) => client.get(`/chatflows-mcp-server/${id}`)

const createMcpServerConfig = (id, body) => client.post(`/chatflows-mcp-server/${id}`, body)

const updateMcpServerConfig = (id, body) => client.put(`/chatflows-mcp-server/${id}`, body)

const deleteMcpServerConfig = (id) => client.delete(`/chatflows-mcp-server/${id}`)

const refreshMcpToken = (id) => client.post(`/chatflows-mcp-server/${id}/refresh`)

export default {
    getMcpServerConfig,
    createMcpServerConfig,
    updateMcpServerConfig,
    deleteMcpServerConfig,
    refreshMcpToken
}
