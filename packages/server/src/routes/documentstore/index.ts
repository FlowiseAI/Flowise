import express from 'express'
import documentStoreController from '../../controllers/documentstore'
const router = express.Router()

router.post('/', documentStoreController.createDocumentStore)
router.get('/', documentStoreController.getAllDocumentStores)
// delete file from document store
router.delete('/:id', documentStoreController.deleteFileFromDocumentStore)
// upload file to document store
router.post('/:id/files', documentStoreController.uploadFileToDocumentStore)
// chunking preview
router.post('/preview/:storeId/:fileId', documentStoreController.previewFileChunks)
// chunking process
router.post('/process/:storeId/:fileId', documentStoreController.processFileChunks)
// Get specific store
router.get('/:id', documentStoreController.getDocumentStoreById)
// Get specific file from a store
router.get('/file/:storeId/:fileId', documentStoreController.getDocumentStoreFileChunks)
// Update documentStore
router.put('/:id', documentStoreController.updateDocumentStore)

export default router
