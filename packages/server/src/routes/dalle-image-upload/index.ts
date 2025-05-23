import express from 'express'
import dalleImageUploadController from '../../controllers/dalle-image-upload'

const router = express.Router()

// POST
router.post('/', dalleImageUploadController.uploadDalleImage)

export default router
