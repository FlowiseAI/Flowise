import express from 'express'
import executionController from '../../controllers/executions'
const router = express.Router()

// READ
router.get('/', executionController.getAllExecutions)
router.get(['/', '/:id'], executionController.getExecutionById)

// PUT
router.put(['/', '/:id'], executionController.updateExecution)

// DELETE - single execution or multiple executions
router.delete('/:id', executionController.deleteExecutions)
router.delete('/', executionController.deleteExecutions)

export default router
