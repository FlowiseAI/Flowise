import express from 'express'
import executionController from '../../controllers/executions'
const router = express.Router()

// READ
router.get(['/', '/:id'], executionController.getAllExecutions)

export default router
