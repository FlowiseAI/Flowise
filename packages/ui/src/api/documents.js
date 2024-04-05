import client from './client'

const getAllDocumentStores = () => client.get('/documentStore')
const getSpecificDocumentStore = (id) => client.get(`/documentStore/${id}`)
const createDocumentStore = (body) => client.post(`/documentStore`, body)
const updateDocumentStore = (id, body) => client.put(`/documentStore/${id}`, body)
const uploadFileToStore = (id, body) => client.post(`/documentStore/${id}/files`, body)
const deleteFileFromStore = (id, fileId) => client.delete(`/documentStore/${id}/${fileId}`)
const previewChunks = (id, fileId, config) => client.post(`/documentStore/preview/${id}/${fileId}`, config)
const processChunks = (id, fileId, config) => client.post(`/documentStore/process/${id}/${fileId}`, config)
const getFileChunks = (storeId, fileId) => client.get(`/documentStore/file/${storeId}/${fileId}`)
//
// const deleteTool = (id) => client.delete(`/tools/${id}`)

export default {
    getAllDocumentStores,
    getSpecificDocumentStore,
    createDocumentStore,
    uploadFileToStore,
    deleteFileFromStore,
    getFileChunks,
    updateDocumentStore,
    previewChunks,
    processChunks
    // deleteTool
}
