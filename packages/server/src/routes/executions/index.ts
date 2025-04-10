import express from 'express'
import executionController from '../../controllers/executions'
const router = express.Router()

// READ
router.get(['/', '/:id'], executionController.getAllExecutions)

// DELETE - single execution or multiple executions
router.delete('/:id', executionController.deleteExecutions)
router.delete('/', executionController.deleteExecutions)

export default router
