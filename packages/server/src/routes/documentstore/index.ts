import documentStoreController from '../../controllers/documentstore'
import { entitled } from '../../services/entitled-router'
import { getMulterStorage } from '../../utils'

const router = entitled.Router()

router.post(['/upsert/', '/upsert/:id'], ['public'], getMulterStorage().array('files'), documentStoreController.upsertDocStoreMiddleware)

router.post(['/refresh/', '/refresh/:id'], ['public'], documentStoreController.refreshDocStoreMiddleware)

/** Document Store Routes */
// Create document store
router.post('/store', ['documentStores:create'], documentStoreController.createDocumentStore)
// List all stores
router.get('/store', ['documentStores:view'], documentStoreController.getAllDocumentStores)
// Get specific store
router.get('/store/:id', ['documentStores:view'], documentStoreController.getDocumentStoreById)
// Update documentStore
router.put('/store/:id', ['documentStores:update'], documentStoreController.updateDocumentStore)
// Delete documentStore
router.delete('/store/:id', ['documentStores:delete'], documentStoreController.deleteDocumentStore)
// Get document store configs
router.get('/store-configs/:id/:loaderId', ['documentStores:view'], documentStoreController.getDocStoreConfigs)

/** Component Nodes = Document Store - Loaders */
// Get all loaders
router.get('/components/loaders', ['documentStores:add-loader'], documentStoreController.getDocumentLoaders)

// delete loader from document store
router.delete('/loader/:id/:loaderId', ['documentStores:delete-loader'], documentStoreController.deleteLoaderFromDocumentStore)
// chunking preview
router.post('/loader/preview', ['documentStores:preview-process'], documentStoreController.previewFileChunks)
// saving process
router.post('/loader/save', ['documentStores:preview-process'], documentStoreController.saveProcessingLoader)
// chunking process
router.post('/loader/process/:loaderId', ['documentStores:preview-process'], documentStoreController.processLoader)

/** Document Store - Loaders - Chunks */
// delete specific file chunk from the store
router.delete('/chunks/:storeId/:loaderId/:chunkId', ['documentStores:delete'], documentStoreController.deleteDocumentStoreFileChunk)
// edit specific file chunk from the store
router.put('/chunks/:storeId/:loaderId/:chunkId', ['documentStores:update'], documentStoreController.editDocumentStoreFileChunk)
// Get all file chunks from the store
router.get('/chunks/:storeId/:fileId/:pageNo', ['documentStores:view'], documentStoreController.getDocumentStoreFileChunks)

// add chunks to the selected vector store
router.post('/vectorstore/insert', ['documentStores:upsert-config'], documentStoreController.insertIntoVectorStore)
// save the selected vector store
router.post('/vectorstore/save', ['documentStores:upsert-config'], documentStoreController.saveVectorStoreConfig)
// delete data from the selected vector store
router.delete('/vectorstore/:storeId', ['documentStores:upsert-config'], documentStoreController.deleteVectorStoreFromStore)
// query the vector store
router.post('/vectorstore/query', ['documentStores:view'], documentStoreController.queryVectorStore)
// Get all embedding providers
router.get('/components/embeddings', ['documentStores:upsert-config'], documentStoreController.getEmbeddingProviders)
// Get all vector store providers
router.get('/components/vectorstore', ['documentStores:upsert-config'], documentStoreController.getVectorStoreProviders)
// Get all Record Manager providers
router.get('/components/recordmanager', ['documentStores:upsert-config'], documentStoreController.getRecordManagerProviders)

// update the selected vector store from the playground
router.post('/vectorstore/update', ['documentStores:upsert-config'], documentStoreController.updateVectorStoreConfigOnly)

// generate docstore tool description
router.post('/generate-tool-desc/:id', ['public'], documentStoreController.generateDocStoreToolDesc)

export default router.getRouter()
