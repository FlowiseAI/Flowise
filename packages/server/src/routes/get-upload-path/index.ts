import express, { Router } from 'express'
import getUploadPathController from '../../controllers/get-upload-path'
const router: Router = express.Router()

// READ
router.get('/', getUploadPathController.getPathForUploads)

export default router
