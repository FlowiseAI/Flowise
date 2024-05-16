import express from 'express'
import getUploadFileController from '../../controllers/get-upload-file'
const router = express.Router()

// READ
router.get('/', getUploadFileController.streamUploadedFile)

export default router
