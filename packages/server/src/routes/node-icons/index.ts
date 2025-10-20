import nodesController from '../../controllers/nodes'
import { entitled } from '../../services/entitled-router'
import { Entitlements } from '../../enterprise/rbac/Entitlements'
const router = entitled.Router()

// CREATE

// READ
router.get(['/', '/:name'], [Entitlements.unspecified], nodesController.getSingleNodeIcon)

// UPDATE

// DELETE

export default router
