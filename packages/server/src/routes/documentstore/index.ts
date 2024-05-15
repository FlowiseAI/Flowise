import express from 'express'
import documentStoreController from '../../controllers/documentstore'
const router = express.Router()

/** Document Store Routes */
// Create document store
router.post('/store', documentStoreController.createDocumentStore)
// List all stores
router.get('/stores', documentStoreController.getAllDocumentStores)
// Get specific store
router.get('/store/:id', documentStoreController.getDocumentStoreById)
// Update documentStore
router.put('/store/:id', documentStoreController.updateDocumentStore)
// Delete documentStore
router.delete('/store/:id', documentStoreController.deleteDocumentStore)

/** Component Nodes = Document Store - Loaders */
// Get all loaders
router.get('/loaders', documentStoreController.getDocumentLoaders)

// delete loader from document store
router.delete('/loader/:id/:loaderId', documentStoreController.deleteLoaderFromDocumentStore)
// chunking preview
router.post('/loader/preview', documentStoreController.previewFileChunks)
// chunking process
router.post('/loader/process', documentStoreController.processFileChunks)

/** Document Store - Loaders - Chunks */
// delete specific file chunk from the store
router.delete('/chunks/:storeId/:loaderId/:chunkId', documentStoreController.deleteDocumentStoreFileChunk)
// edit specific file chunk from the store
router.put('/chunks/:storeId/:loaderId/:chunkId', documentStoreController.editDocumentStoreFileChunk)
// Get all file chunks from the store
router.get('/chunks/:storeId/:fileId/:pageNo', documentStoreController.getDocumentStoreFileChunks)

export default router
