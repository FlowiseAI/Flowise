import express from 'express'
import vectorsController from '../../controllers/vectors'
const router = express.Router()

// CREATE
router.post(
    '/upsert/:id',
    vectorsController.uploadFilesMiddleware,
    vectorsController.getRateLimiterMiddleware,
    vectorsController.upsertVectorMiddleware
)
router.post('/internal-upsert/:id', vectorsController.createInternalUpsert)

export default router
