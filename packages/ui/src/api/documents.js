import client from './client'

const getAllDocumentStores = () => client.get('/documentStores')
const getSpecificDocumentStore = (id) => client.get(`/documentStores/${id}`)
const createDocumentStore = (body) => client.post(`/documentStores`, body)
const updateDocumentStore = (id, body) => client.put(`/documentStores/${id}`, body)
const uploadFileToStore = (body) => client.post(`/documentStores/files`, body)
const deleteFileFromStore = (id, fileId) => client.delete(`/documentStores/${id}/${fileId}`)
const getFileChunks = (storeId, fileId) => client.get(`/documentStores/file/${storeId}/${fileId}`)
//
// const deleteTool = (id) => client.delete(`/tools/${id}`)

export default {
    getAllDocumentStores,
    getSpecificDocumentStore,
    createDocumentStore,
    uploadFileToStore,
    deleteFileFromStore,
    getFileChunks,
    updateDocumentStore
    // deleteTool
}
