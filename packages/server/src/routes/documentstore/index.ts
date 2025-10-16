import documentStoreController from '../../controllers/documentstore'
import { entitled } from '../../services/entitled-router'
import { getMulterStorage } from '../../utils'
import { Entitlements } from '../../enterprise/rbac/Entitlements'

const router = entitled.Router()

router.post(
    ['/upsert/', '/upsert/:id'],
    [Entitlements.unspecified],
    getMulterStorage().array('files'),
    documentStoreController.upsertDocStoreMiddleware
)

router.post(['/refresh/', '/refresh/:id'], [Entitlements.unspecified], documentStoreController.refreshDocStoreMiddleware)

/** Document Store Routes */
// Create document store
router.post('/store', [Entitlements.documentStores.create], documentStoreController.createDocumentStore)
// List all stores
router.get('/store', [Entitlements.documentStores.view], documentStoreController.getAllDocumentStores)
// Get specific store
router.get('/store/:id', [Entitlements.documentStores.view], documentStoreController.getDocumentStoreById)
// Update documentStore
router.put('/store/:id', [Entitlements.documentStores.update], documentStoreController.updateDocumentStore)
// Delete documentStore
router.delete('/store/:id', [Entitlements.documentStores.delete], documentStoreController.deleteDocumentStore)
// Get document store configs
router.get('/store-configs/:id/:loaderId', [Entitlements.documentStores.view], documentStoreController.getDocStoreConfigs)

/** Component Nodes = Document Store - Loaders */
// Get all loaders
router.get('/components/loaders', [Entitlements.documentStores.addLoader], documentStoreController.getDocumentLoaders)

// delete loader from document store
router.delete('/loader/:id/:loaderId', [Entitlements.documentStores.deleteLoader], documentStoreController.deleteLoaderFromDocumentStore)
// chunking preview
router.post('/loader/preview', [Entitlements.documentStores.previewProcess], documentStoreController.previewFileChunks)
// saving process
router.post('/loader/save', [Entitlements.documentStores.previewProcess], documentStoreController.saveProcessingLoader)
// chunking process
router.post('/loader/process/:loaderId', [Entitlements.documentStores.previewProcess], documentStoreController.processLoader)

/** Document Store - Loaders - Chunks */
// delete specific file chunk from the store
router.delete(
    '/chunks/:storeId/:loaderId/:chunkId',
    [Entitlements.documentStores.delete],
    documentStoreController.deleteDocumentStoreFileChunk
)
// edit specific file chunk from the store
router.put('/chunks/:storeId/:loaderId/:chunkId', [Entitlements.documentStores.update], documentStoreController.editDocumentStoreFileChunk)
// Get all file chunks from the store
router.get('/chunks/:storeId/:fileId/:pageNo', [Entitlements.documentStores.view], documentStoreController.getDocumentStoreFileChunks)

// add chunks to the selected vector store
router.post('/vectorstore/insert', [Entitlements.documentStores.upsertConfig], documentStoreController.insertIntoVectorStore)
// save the selected vector store
router.post('/vectorstore/save', [Entitlements.documentStores.upsertConfig], documentStoreController.saveVectorStoreConfig)
// delete data from the selected vector store
router.delete('/vectorstore/:storeId', [Entitlements.documentStores.upsertConfig], documentStoreController.deleteVectorStoreFromStore)
// query the vector store
router.post('/vectorstore/query', [Entitlements.documentStores.view], documentStoreController.queryVectorStore)
// Get all embedding providers
router.get('/components/embeddings', [Entitlements.documentStores.upsertConfig], documentStoreController.getEmbeddingProviders)
// Get all vector store providers
router.get('/components/vectorstore', [Entitlements.documentStores.upsertConfig], documentStoreController.getVectorStoreProviders)
// Get all Record Manager providers
router.get('/components/recordmanager', [Entitlements.documentStores.upsertConfig], documentStoreController.getRecordManagerProviders)

// update the selected vector store from the playground
router.post('/vectorstore/update', [Entitlements.documentStores.upsertConfig], documentStoreController.updateVectorStoreConfigOnly)

// generate docstore tool description
router.post('/generate-tool-desc/:id', [Entitlements.unspecified], documentStoreController.generateDocStoreToolDesc)

export default router.getRouter()
