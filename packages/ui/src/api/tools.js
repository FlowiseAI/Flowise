import client from './client'

const getAllTools = () => client.get('/tools')

const getSpecificTool = (id) => client.get(`/tools/${id}`)

const createNewTool = (body) => client.post(`/tools`, body)

const updateTool = (id, body) => client.put(`/tools/${id}`, body)

const deleteTool = (id) => client.delete(`/tools/${id}`)

export default {
    getAllTools,
    getSpecificTool,
    createNewTool,
    updateTool,
    deleteTool
}
