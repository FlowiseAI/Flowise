import express from 'express'
import langfuseController from '../../controllers/langfuse'

const router = express.Router()

// READ
router.get('/healthcheck', langfuseController.getHealthCheck)

export default router
