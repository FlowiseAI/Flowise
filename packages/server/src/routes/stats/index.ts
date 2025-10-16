import statsController from '../../controllers/stats'
import { entitled } from '../../services/entitled-router'
import { Entitlements } from '../../enterprise/rbac/Entitlements'

const router = entitled.Router()

// READ
router.get(['/', '/:id'], [Entitlements.unspecified], statsController.getChatflowStats)

export default router.getRouter()
