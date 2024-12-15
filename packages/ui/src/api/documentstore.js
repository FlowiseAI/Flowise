import client from './client'

const getAllDocumentStores = () => client.get('/document-store/store')
const getDocumentLoaders = () => client.get('/document-store/components/loaders')
const getSpecificDocumentStore = (id) => client.get(`/document-store/store/${id}`)
const createDocumentStore = (body) => client.post(`/document-store/store`, body)
const updateDocumentStore = (id, body) => client.put(`/document-store/store/${id}`, body)
const deleteDocumentStore = (id) => client.delete(`/document-store/store/${id}`)

const deleteLoaderFromStore = (id, fileId) => client.delete(`/document-store/loader/${id}/${fileId}`)
const deleteChunkFromStore = (storeId, loaderId, chunkId) => client.delete(`/document-store/chunks/${storeId}/${loaderId}/${chunkId}`)
const editChunkFromStore = (storeId, loaderId, chunkId, body) =>
    client.put(`/document-store/chunks/${storeId}/${loaderId}/${chunkId}`, body)

const getFileChunks = (storeId, fileId, pageNo) => client.get(`/document-store/chunks/${storeId}/${fileId}/${pageNo}`)
const previewChunks = (body) => client.post('/document-store/loader/preview', body)
const processLoader = (body, loaderId) => client.post(`/document-store/loader/process/${loaderId}`, body)
const saveProcessingLoader = (body) => client.post(`/document-store/loader/save`, body)
const refreshLoader = (storeId) => client.post(`/document-store/refresh/${storeId}`)

const insertIntoVectorStore = (body) => client.post(`/document-store/vectorstore/insert`, body)
const saveVectorStoreConfig = (body) => client.post(`/document-store/vectorstore/save`, body)
const updateVectorStoreConfig = (body) => client.post(`/document-store/vectorstore/update`, body)
const deleteVectorStoreDataFromStore = (storeId) => client.delete(`/document-store/vectorstore/${storeId}`)
const queryVectorStore = (body) => client.post(`/document-store/vectorstore/query`, body)
const getVectorStoreProviders = () => client.get('/document-store/components/vectorstore')
const getEmbeddingProviders = () => client.get('/document-store/components/embeddings')
const getRecordManagerProviders = () => client.get('/document-store/components/recordmanager')

const generateDocStoreToolDesc = (storeId, body) => client.post('/document-store/generate-tool-desc/' + storeId, body)

export default {
    getAllDocumentStores,
    getSpecificDocumentStore,
    createDocumentStore,
    deleteLoaderFromStore,
    getFileChunks,
    updateDocumentStore,
    previewChunks,
    processLoader,
    getDocumentLoaders,
    deleteChunkFromStore,
    editChunkFromStore,
    deleteDocumentStore,
    insertIntoVectorStore,
    getVectorStoreProviders,
    getEmbeddingProviders,
    getRecordManagerProviders,
    saveVectorStoreConfig,
    queryVectorStore,
    deleteVectorStoreDataFromStore,
    updateVectorStoreConfig,
    saveProcessingLoader,
    refreshLoader,
    generateDocStoreToolDesc
}
