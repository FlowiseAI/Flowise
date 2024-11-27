import express from 'express'
import documentStoreController from '../../controllers/documentstore'
import multer from 'multer'
import path from 'path'

const router = express.Router()
const upload = multer({ dest: `${path.join(__dirname, '..', '..', '..', 'uploads')}/` })

router.post(['/upsert/', '/upsert/:id'], upload.array('files'), documentStoreController.upsertDocStoreMiddleware)

router.post(['/refresh/', '/refresh/:id'], documentStoreController.refreshDocStoreMiddleware)

/** Document Store Routes */
// Create document store
router.post('/store', documentStoreController.createDocumentStore)
// List all stores
router.get('/store', documentStoreController.getAllDocumentStores)
// Get specific store
router.get('/store/:id', documentStoreController.getDocumentStoreById)
// Update documentStore
router.put('/store/:id', documentStoreController.updateDocumentStore)
// Delete documentStore
router.delete('/store/:id', documentStoreController.deleteDocumentStore)

/** Component Nodes = Document Store - Loaders */
// Get all loaders
router.get('/components/loaders', documentStoreController.getDocumentLoaders)

// delete loader from document store
router.delete('/loader/:id/:loaderId', documentStoreController.deleteLoaderFromDocumentStore)
// chunking preview
router.post('/loader/preview', documentStoreController.previewFileChunks)
// saving process
router.post('/loader/save', documentStoreController.saveProcessingLoader)
// chunking process
router.post('/loader/process/:loaderId', documentStoreController.processLoader)

/** Document Store - Loaders - Chunks */
// delete specific file chunk from the store
router.delete('/chunks/:storeId/:loaderId/:chunkId', documentStoreController.deleteDocumentStoreFileChunk)
// edit specific file chunk from the store
router.put('/chunks/:storeId/:loaderId/:chunkId', documentStoreController.editDocumentStoreFileChunk)
// Get all file chunks from the store
router.get('/chunks/:storeId/:fileId/:pageNo', documentStoreController.getDocumentStoreFileChunks)

// add chunks to the selected vector store
router.post('/vectorstore/insert', documentStoreController.insertIntoVectorStore)
// save the selected vector store
router.post('/vectorstore/save', documentStoreController.saveVectorStoreConfig)
// delete data from the selected vector store
router.delete('/vectorstore/:storeId', documentStoreController.deleteVectorStoreFromStore)
// query the vector store
router.post('/vectorstore/query', documentStoreController.queryVectorStore)
// Get all embedding providers
router.get('/components/embeddings', documentStoreController.getEmbeddingProviders)
// Get all vector store providers
router.get('/components/vectorstore', documentStoreController.getVectorStoreProviders)
// Get all Record Manager providers
router.get('/components/recordmanager', documentStoreController.getRecordManagerProviders)

// update the selected vector store from the playground
router.post('/vectorstore/update', documentStoreController.updateVectorStoreConfigOnly)

export default router
