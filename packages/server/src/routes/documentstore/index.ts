import documentStoreController from '../../controllers/documentstore'
import { entitled } from '../../services/entitled-router'
import { getMulterStorage } from '../../utils'
import { Entitlements } from '../../enterprise/rbac/Entitlements'
import { AuthenticationStrategy } from '../../enterprise/auth/AuthenticationStrategy'

const router = entitled.Router()

router.post(
    ['/upsert/', '/upsert/:id'],
    [Entitlements.unspecified],
    [AuthenticationStrategy.SESSION],
    getMulterStorage().array('files'),
    documentStoreController.upsertDocStoreMiddleware
)

router.post(['/refresh/', '/refresh/:id'], [Entitlements.unspecified], [AuthenticationStrategy.SESSION], documentStoreController.refreshDocStoreMiddleware)

/** Document Store Routes */
// Create document store
router.post('/store', [Entitlements.documentStores.create], [AuthenticationStrategy.JWT, AuthenticationStrategy.API_KEY], documentStoreController.createDocumentStore)
// List all stores
router.get('/store', [Entitlements.documentStores.view], [AuthenticationStrategy.JWT, AuthenticationStrategy.API_KEY], documentStoreController.getAllDocumentStores)
// Get specific store
router.get('/store/:id', [Entitlements.documentStores.view], [AuthenticationStrategy.JWT, AuthenticationStrategy.API_KEY], documentStoreController.getDocumentStoreById)
// Update documentStore
router.put('/store/:id', [Entitlements.documentStores.update], [AuthenticationStrategy.JWT, AuthenticationStrategy.API_KEY], documentStoreController.updateDocumentStore)
// Delete documentStore
router.delete('/store/:id', [Entitlements.documentStores.delete], [AuthenticationStrategy.JWT, AuthenticationStrategy.API_KEY], documentStoreController.deleteDocumentStore)
// Get document store configs
router.get('/store-configs/:id/:loaderId', [Entitlements.documentStores.view], [AuthenticationStrategy.JWT, AuthenticationStrategy.API_KEY], documentStoreController.getDocStoreConfigs)

/** Component Nodes = Document Store - Loaders */
// Get all loaders
router.get('/components/loaders', [Entitlements.documentStores.addLoader], [AuthenticationStrategy.JWT, AuthenticationStrategy.API_KEY], documentStoreController.getDocumentLoaders)

// delete loader from document store
router.delete('/loader/:id/:loaderId', [Entitlements.documentStores.deleteLoader], [AuthenticationStrategy.JWT, AuthenticationStrategy.API_KEY], documentStoreController.deleteLoaderFromDocumentStore)
// chunking preview
router.post('/loader/preview', [Entitlements.documentStores.previewProcess], [AuthenticationStrategy.JWT, AuthenticationStrategy.API_KEY], documentStoreController.previewFileChunks)
// saving process
router.post('/loader/save', [Entitlements.documentStores.previewProcess], [AuthenticationStrategy.JWT, AuthenticationStrategy.API_KEY], documentStoreController.saveProcessingLoader)
// chunking process
router.post('/loader/process/:loaderId', [Entitlements.documentStores.previewProcess], [AuthenticationStrategy.JWT, AuthenticationStrategy.API_KEY], documentStoreController.processLoader)

/** Document Store - Loaders - Chunks */
// delete specific file chunk from the store
router.delete(
    '/chunks/:storeId/:loaderId/:chunkId',
    [Entitlements.documentStores.delete],
    [AuthenticationStrategy.JWT, AuthenticationStrategy.API_KEY],
    documentStoreController.deleteDocumentStoreFileChunk
)
// edit specific file chunk from the store
router.put('/chunks/:storeId/:loaderId/:chunkId', [Entitlements.documentStores.update], [AuthenticationStrategy.JWT, AuthenticationStrategy.API_KEY], documentStoreController.editDocumentStoreFileChunk)
// Get all file chunks from the store
router.get('/chunks/:storeId/:fileId/:pageNo', [Entitlements.documentStores.view], [AuthenticationStrategy.JWT, AuthenticationStrategy.API_KEY], documentStoreController.getDocumentStoreFileChunks)

// add chunks to the selected vector store
router.post('/vectorstore/insert', [Entitlements.documentStores.upsertConfig], [AuthenticationStrategy.JWT, AuthenticationStrategy.API_KEY], documentStoreController.insertIntoVectorStore)
// save the selected vector store
router.post('/vectorstore/save', [Entitlements.documentStores.upsertConfig], [AuthenticationStrategy.JWT, AuthenticationStrategy.API_KEY], documentStoreController.saveVectorStoreConfig)
// delete data from the selected vector store
router.delete('/vectorstore/:storeId', [Entitlements.documentStores.upsertConfig], [AuthenticationStrategy.JWT, AuthenticationStrategy.API_KEY], documentStoreController.deleteVectorStoreFromStore)
// query the vector store
router.post('/vectorstore/query', [Entitlements.documentStores.view], [AuthenticationStrategy.JWT, AuthenticationStrategy.API_KEY], documentStoreController.queryVectorStore)
// Get all embedding providers
router.get('/components/embeddings', [Entitlements.documentStores.upsertConfig], [AuthenticationStrategy.JWT, AuthenticationStrategy.API_KEY], documentStoreController.getEmbeddingProviders)
// Get all vector store providers
router.get('/components/vectorstore', [Entitlements.documentStores.upsertConfig], [AuthenticationStrategy.JWT, AuthenticationStrategy.API_KEY], documentStoreController.getVectorStoreProviders)
// Get all Record Manager providers
router.get('/components/recordmanager', [Entitlements.documentStores.upsertConfig], [AuthenticationStrategy.JWT, AuthenticationStrategy.API_KEY], documentStoreController.getRecordManagerProviders)

// update the selected vector store from the playground
router.post('/vectorstore/update', [Entitlements.documentStores.upsertConfig], [AuthenticationStrategy.JWT, AuthenticationStrategy.API_KEY], documentStoreController.updateVectorStoreConfigOnly)

// generate docstore tool description
router.post('/generate-tool-desc/:id', [Entitlements.unspecified], [AuthenticationStrategy.PUBLIC], documentStoreController.generateDocStoreToolDesc)

export default router.getRouter()
