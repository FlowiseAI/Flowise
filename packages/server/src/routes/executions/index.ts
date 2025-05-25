import express from 'express'
import executionController from '../../controllers/executions'
import { checkAnyPermission } from '../../enterprise/rbac/PermissionCheck'
const router = express.Router()

// READ
router.get('/', checkAnyPermission('executions:view'), executionController.getAllExecutions)
router.get(['/', '/:id'], checkAnyPermission('executions:view'), executionController.getExecutionById)

// PUT
router.put(['/', '/:id'], executionController.updateExecution)

// DELETE - single execution or multiple executions
router.delete('/:id', checkAnyPermission('executions:delete'), executionController.deleteExecutions)
router.delete('/', checkAnyPermission('executions:delete'), executionController.deleteExecutions)

export default router
