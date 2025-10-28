import nodesController from '../../controllers/nodes'
import { entitled } from '../../services/entitled-router'
import { Entitlements } from '../../enterprise/rbac/Entitlements'
import { AuthenticationStrategy } from '../../enterprise/auth/AuthenticationStrategy'

const router = entitled.Router()

// READ
router.get('/', [Entitlements.unspecified], [AuthenticationStrategy.PUBLIC], nodesController.getAllNodes)
router.get(['/', '/:name'], [Entitlements.unspecified], [AuthenticationStrategy.PUBLIC], nodesController.getNodeByName)
router.get('/category/:name', [Entitlements.unspecified], [AuthenticationStrategy.PUBLIC], nodesController.getNodesByCategory)

export default router
