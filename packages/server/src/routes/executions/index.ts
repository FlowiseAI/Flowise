import express from 'express'
import executionController from '../../controllers/executions'
import enforceAbility from '../../middlewares/authentication/enforceAbility'
const router = express.Router()

// READ
router.get('/', enforceAbility('Execution'), executionController.getAllExecutions)
router.get(['/', '/:id'], enforceAbility('Execution'), executionController.getExecutionById)

// PUT
router.put(['/', '/:id'], enforceAbility('Execution'), executionController.updateExecution)

// DELETE - single execution or multiple executions
router.delete('/:id', enforceAbility('Execution'), executionController.deleteExecutions)
router.delete('/', enforceAbility('Execution'), executionController.deleteExecutions)

export default router
