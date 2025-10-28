import executionController from '../../controllers/executions'
import { entitled } from '../../services/entitled-router'
import { Entitlements } from '../../enterprise/rbac/Entitlements'
import { AuthenticationStrategy } from '../../enterprise/auth/AuthenticationStrategy'

const router = entitled.Router()

// READ
router.get(
    '/',
    [Entitlements.executions.view],
    [AuthenticationStrategy.JWT, AuthenticationStrategy.API_KEY],
    executionController.getAllExecutions
)
router.get(
    '/:id',
    [Entitlements.executions.view],
    [AuthenticationStrategy.JWT, AuthenticationStrategy.API_KEY],
    executionController.getExecutionById
)

// PUT
router.put(['/', '/:id'], [Entitlements.unspecified], [AuthenticationStrategy.SESSION], executionController.updateExecution)

// DELETE - single execution or multiple executions
router.delete(
    '/:id',
    [Entitlements.executions.delete],
    [AuthenticationStrategy.JWT, AuthenticationStrategy.API_KEY],
    executionController.deleteExecutions
)
router.delete(
    '/',
    [Entitlements.executions.delete],
    [AuthenticationStrategy.JWT, AuthenticationStrategy.API_KEY],
    executionController.deleteExecutions
)

export default router
