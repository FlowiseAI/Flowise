import executionController from '../../controllers/executions'
import { entitled } from '../../services/entitled-router'
import { Entitlements } from '../../enterprise/rbac/Entitlements'

const router = entitled.Router()

// READ
router.get('/', [Entitlements.executions.view], executionController.getAllExecutions)
router.get('/:id', [Entitlements.executions.view], executionController.getExecutionById)

// PUT
router.put(['/', '/:id'], [Entitlements.unspecified], executionController.updateExecution)

// DELETE - single execution or multiple executions
router.delete('/:id', [Entitlements.executions.delete], executionController.deleteExecutions)
router.delete('/', [Entitlements.executions.delete], executionController.deleteExecutions)

export default router
