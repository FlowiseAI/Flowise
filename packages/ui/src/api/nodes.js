import client from './client'

const getAllNodes = () => client.get('/nodes')

const getSpecificNode = (name) => client.get(`/nodes/${name}`)
const getNodesByCategory = (name) => client.get(`/nodes/category/${name}`)

const executeCustomFunctionNode = (body) => client.post(`/node-custom-function`, body)

export default {
    getAllNodes,
    getSpecificNode,
    executeCustomFunctionNode,
    getNodesByCategory
}
