import client from './client'

const getAllNodes = () => client.get('/nodes', { params: { client: 'agentflowv2' } })

const getSpecificNode = (name) => client.get(`/nodes/${name}`, { params: { client: 'agentflowv2' } })
const getNodesByCategory = (name) => client.get(`/nodes/category/${name}`, { params: { client: 'agentflowv2' } })

const executeCustomFunctionNode = (body) => client.post(`/node-custom-function`, body)

const executeNodeLoadMethod = (name, body) => client.post(`/node-load-method/${name}`, body)

export default {
    getAllNodes,
    getSpecificNode,
    executeCustomFunctionNode,
    getNodesByCategory,
    executeNodeLoadMethod
}
