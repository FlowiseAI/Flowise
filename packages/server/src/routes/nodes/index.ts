import nodesController from '../../controllers/nodes'
import { entitled } from '../../services/entitled-router'
import { Entitlements } from '../../enterprise/rbac/Entitlements'
const router = entitled.Router()

// READ
router.get('/', [Entitlements.unspecified], nodesController.getAllNodes)
router.get(['/', '/:name'], [Entitlements.unspecified], nodesController.getNodeByName)
router.get('/category/:name', [Entitlements.unspecified], nodesController.getNodesByCategory)

export default router
