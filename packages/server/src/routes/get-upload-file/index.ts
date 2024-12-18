import express, { Router } from 'express'
import getUploadFileController from '../../controllers/get-upload-file'
const router: Router = express.Router()

// READ
router.get('/', getUploadFileController.streamUploadedFile)

export default router
