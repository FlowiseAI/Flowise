import express from 'express'
import dalleImageUploadController from '../../controllers/dalle-image-upload'

const router = express.Router()

// POST
router.post('/', dalleImageUploadController.uploadDalleImage)

// GET
router.get('/archive', dalleImageUploadController.listArchivedImages)

export default router
