import express from 'express'
import multer from 'multer'
import vectorsController from '../../controllers/vectors'
import { getUploadPath } from '../../utils'

const router = express.Router()

const upload = multer({ dest: getUploadPath() })

// CREATE
router.post(
    ['/upsert/', '/upsert/:id'],
    upload.array('files'),
    vectorsController.getRateLimiterMiddleware,
    vectorsController.upsertVectorMiddleware
)
router.post(['/internal-upsert/', '/internal-upsert/:id'], upload.array('files'), vectorsController.createInternalUpsert)

export default router
