import client from './client'

const getAllNodes = () => client.get('/nodes')

const getSpecificNode = (name) => client.get(`/nodes/${name}`)

export default {
    getAllNodes,
    getSpecificNode
}
