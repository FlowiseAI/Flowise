import client from './client'

const getAllCustomMcpServers = (params) => client.get('/custom-mcp-servers', { params })

const getCustomMcpServer = (id) => client.get(`/custom-mcp-servers/${id}`)

const createCustomMcpServer = (body) => client.post(`/custom-mcp-servers`, body)

const updateCustomMcpServer = (id, body) => client.put(`/custom-mcp-servers/${id}`, body)

const deleteCustomMcpServer = (id) => client.delete(`/custom-mcp-servers/${id}`)

const authorizeCustomMcpServer = (id) => client.post(`/custom-mcp-servers/${id}/authorize`)

const getCustomMcpServerTools = (id) => client.get(`/custom-mcp-servers/${id}/tools`)

export default {
    getAllCustomMcpServers,
    getCustomMcpServer,
    createCustomMcpServer,
    updateCustomMcpServer,
    deleteCustomMcpServer,
    authorizeCustomMcpServer,
    getCustomMcpServerTools
}
