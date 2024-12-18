import express from 'express'
import multer from 'multer'
import predictionsController from '../../controllers/predictions'
import { getUploadPath } from '../../utils'

const router = express.Router()

const upload = multer({ dest: getUploadPath() })

// CREATE
router.post(['/', '/:id'], upload.array('files'), predictionsController.getRateLimiterMiddleware, predictionsController.createPrediction)

export default router
