import express from 'express'
import multer from 'multer'
import path from 'path'
import vectorsController from '../../controllers/vectors'

const router = express.Router()

const upload = multer({ dest: `${path.join(__dirname, '..', '..', '..', 'uploads')}/` })

// CREATE
router.post('/upsert/:id', upload.array('files'), vectorsController.getRateLimiterMiddleware, vectorsController.upsertVectorMiddleware)
router.post('/internal-upsert/:id', vectorsController.createInternalUpsert)

export default router
