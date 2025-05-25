import express from 'express'
import { checkPermission, checkAnyPermission } from '../../enterprise/rbac/PermissionCheck'
import documentStoreController from '../../controllers/documentstore'
import { getMulterStorage } from '../../utils'

const router = express.Router()

router.post(['/upsert/', '/upsert/:id'], getMulterStorage().array('files'), documentStoreController.upsertDocStoreMiddleware)

router.post(['/refresh/', '/refresh/:id'], documentStoreController.refreshDocStoreMiddleware)

/** Document Store Routes */
// Create document store
router.post('/store', checkPermission('documentStores:create'), documentStoreController.createDocumentStore)
// List all stores
router.get('/store', checkPermission('documentStores:view'), documentStoreController.getAllDocumentStores)
// Get specific store
router.get(
    '/store/:id',
    checkAnyPermission('documentStores:view,documentStores:update,documentStores:delete'),
    documentStoreController.getDocumentStoreById
)
// Update documentStore
router.put('/store/:id', checkAnyPermission('documentStores:create,documentStores:update'), documentStoreController.updateDocumentStore)
// Delete documentStore
router.delete('/store/:id', checkPermission('documentStores:delete'), documentStoreController.deleteDocumentStore)
// Get document store configs
router.get('/store-configs/:id/:loaderId', checkAnyPermission('documentStores:view'), documentStoreController.getDocStoreConfigs)

/** Component Nodes = Document Store - Loaders */
// Get all loaders
router.get('/components/loaders', checkPermission('documentStores:add-loader'), documentStoreController.getDocumentLoaders)

// delete loader from document store
router.delete(
    '/loader/:id/:loaderId',
    checkPermission('documentStores:delete-loader'),
    documentStoreController.deleteLoaderFromDocumentStore
)
// chunking preview
router.post('/loader/preview', checkPermission('documentStores:preview-process'), documentStoreController.previewFileChunks)
// saving process
router.post('/loader/save', checkPermission('documentStores:preview-process'), documentStoreController.saveProcessingLoader)
// chunking process
router.post('/loader/process/:loaderId', checkPermission('documentStores:preview-process'), documentStoreController.processLoader)

/** Document Store - Loaders - Chunks */
// delete specific file chunk from the store
router.delete(
    '/chunks/:storeId/:loaderId/:chunkId',
    checkAnyPermission('documentStores:update,documentStores:delete'),
    documentStoreController.deleteDocumentStoreFileChunk
)
// edit specific file chunk from the store
router.put(
    '/chunks/:storeId/:loaderId/:chunkId',
    checkPermission('documentStores:update'),
    documentStoreController.editDocumentStoreFileChunk
)
// Get all file chunks from the store
router.get('/chunks/:storeId/:fileId/:pageNo', checkPermission('documentStores:view'), documentStoreController.getDocumentStoreFileChunks)

// add chunks to the selected vector store
router.post('/vectorstore/insert', checkPermission('documentStores:upsert-config'), documentStoreController.insertIntoVectorStore)
// save the selected vector store
router.post('/vectorstore/save', checkPermission('documentStores:upsert-config'), documentStoreController.saveVectorStoreConfig)
// delete data from the selected vector store
router.delete('/vectorstore/:storeId', checkPermission('documentStores:upsert-config'), documentStoreController.deleteVectorStoreFromStore)
// query the vector store
router.post('/vectorstore/query', checkPermission('documentStores:view'), documentStoreController.queryVectorStore)
// Get all embedding providers
router.get('/components/embeddings', checkPermission('documentStores:upsert-config'), documentStoreController.getEmbeddingProviders)
// Get all vector store providers
router.get('/components/vectorstore', checkPermission('documentStores:upsert-config'), documentStoreController.getVectorStoreProviders)
// Get all Record Manager providers
router.get('/components/recordmanager', checkPermission('documentStores:upsert-config'), documentStoreController.getRecordManagerProviders)

// update the selected vector store from the playground
router.post('/vectorstore/update', checkPermission('documentStores:upsert-config'), documentStoreController.updateVectorStoreConfigOnly)

// generate docstore tool description
router.post('/generate-tool-desc/:id', documentStoreController.generateDocStoreToolDesc)

export default router
