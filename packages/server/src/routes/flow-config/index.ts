import flowConfigsController from '../../controllers/flow-configs'
import { entitled } from '../../services/entitled-router'
import { Entitlements } from '../../enterprise/rbac/Entitlements'
const router = entitled.Router()

// CREATE

// READ
router.get(['/', '/:id'], [Entitlements.unspecified], flowConfigsController.getSingleFlowConfig)

// UPDATE

// DELETE

export default router
