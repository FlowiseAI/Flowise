import client from './client'

const getAllDocumentStores = () => client.get('/document-store')
const getSpecificDocumentStore = (id) => client.get(`/document-store/${id}`)
const createDocumentStore = (body) => client.post(`/document-store`, body)
const updateDocumentStore = (id, body) => client.put(`/document-store/${id}`, body)
//const uploadFileToStore = (id, body) => client.post(`/document-store/${id}/files`, body)
const deleteFileFromStore = (id, fileId) => client.delete(`/document-store/${id}/${fileId}`)
// const previewChunks = (id, fileId, config) => client.post(`/document-store/preview/${id}/${fileId}`, config)
const getFileChunks = (storeId, fileId) => client.get(`/document-store/chunks/${storeId}/${fileId}`)
const previewChunks = (body) => client.post('/document-store/preview', body)
const processChunks = (body) => client.post(`/document-store/process`, body)

export default {
    getAllDocumentStores,
    getSpecificDocumentStore,
    createDocumentStore,
    deleteFileFromStore,
    getFileChunks,
    updateDocumentStore,
    previewChunks,
    processChunks
}
