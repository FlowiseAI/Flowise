import nodesController from '../../controllers/nodes'
import { entitled } from '../../services/entitled-router'
import { Entitlements } from '../../enterprise/rbac/Entitlements'
import { AuthenticationStrategy } from '../../enterprise/auth/AuthenticationStrategy'

const router = entitled.Router()

// CREATE

// READ
router.get(['/', '/:name'], [Entitlements.unspecified], [AuthenticationStrategy.PUBLIC], nodesController.getSingleNodeIcon)

// UPDATE

// DELETE

export default router
