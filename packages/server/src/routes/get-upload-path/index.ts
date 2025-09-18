import express from 'express'
import getUploadPathController from '../../controllers/get-upload-path'
const router = express.Router()

// READ
router.get('/', getUploadPathController.getPathForUploads)

export default router
