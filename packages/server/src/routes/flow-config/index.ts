import flowConfigsController from '../../controllers/flow-configs'
import { entitled } from '../../services/entitled-router'
import { Entitlements } from '../../enterprise/rbac/Entitlements'
import { AuthenticationStrategy } from '../../enterprise/auth/AuthenticationStrategy'

const router = entitled.Router()

// CREATE

// READ
router.get(['/', '/:id'], [Entitlements.unspecified], [AuthenticationStrategy.PUBLIC], flowConfigsController.getSingleFlowConfig)

// UPDATE

// DELETE

export default router
