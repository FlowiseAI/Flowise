import executionController from '../../controllers/executions'
import { entitled } from '../../services/entitled-router'
import { Entitlements } from '../../enterprise/rbac/Entitlements'

const router = entitled.Router()

// READ
router.get(['/', '/:id'], [Entitlements.unspecified], executionController.getPublicExecutionById)

export default router.getRouter()
