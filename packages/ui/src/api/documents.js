import client from './client'

const getAllDocumentStores = () => client.get('/documentStores')

const getSpecificDocumentStore = (id) => client.get(`/documentStores/${id}`)
//
// const createNewTool = (body) => client.post(`/tools`, body)
//
// const updateTool = (id, body) => client.put(`/tools/${id}`, body)
//
// const deleteTool = (id) => client.delete(`/tools/${id}`)

export default {
    getAllDocumentStores,
    getSpecificDocumentStore
    // getSpecificTool,
    // createNewTool,
    // updateTool,
    // deleteTool
}
