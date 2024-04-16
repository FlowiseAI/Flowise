import client from './client'

const getAllDocumentStores = () => client.get('/document-store')
const getDocumentLoaders = () => client.get('/document-store/loaders')
const getSpecificDocumentStore = (id) => client.get(`/document-store/${id}`)
const createDocumentStore = (body) => client.post(`/document-store`, body)
const updateDocumentStore = (id, body) => client.put(`/document-store/${id}`, body)

const deleteLoaderFromStore = (id, fileId) => client.delete(`/document-store/loader/${id}/${fileId}`)
const deleteChunkFromStore = (storeId, loaderId, chunkId) => client.delete(`/document-store/chunks/${storeId}/${loaderId}/${chunkId}`)
const editChunkFromStore = (storeId, loaderId, chunkId, body) =>
    client.put(`/document-store/chunks/${storeId}/${loaderId}/${chunkId}`, body)

const getFileChunks = (storeId, fileId) => client.get(`/document-store/chunks/${storeId}/${fileId}`)
const previewChunks = (body) => client.post('/document-store/loader/preview', body)
const processChunks = (body) => client.post(`/document-store/loader/process`, body)

export default {
    getAllDocumentStores,
    getSpecificDocumentStore,
    createDocumentStore,
    deleteLoaderFromStore,
    getFileChunks,
    updateDocumentStore,
    previewChunks,
    processChunks,
    getDocumentLoaders,
    deleteChunkFromStore,
    editChunkFromStore
}
