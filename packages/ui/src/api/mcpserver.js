import client from './client'

const getMcpServerConfig = (id) => client.get(`/mcp-server/${id}`)

const createMcpServerConfig = (id, body) => client.post(`/mcp-server/${id}`, body)

const updateMcpServerConfig = (id, body) => client.put(`/mcp-server/${id}`, body)

const deleteMcpServerConfig = (id) => client.delete(`/mcp-server/${id}`)

const refreshMcpToken = (id) => client.post(`/mcp-server/${id}/refresh`)

export default {
    getMcpServerConfig,
    createMcpServerConfig,
    updateMcpServerConfig,
    deleteMcpServerConfig,
    refreshMcpToken
}
