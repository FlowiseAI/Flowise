import pingController from '../../controllers/ping'
import { entitled } from '../../services/entitled-router'
import { Entitlements } from '../../enterprise/rbac/Entitlements'
const router = entitled.Router()

// GET
router.get('/', [Entitlements.unspecified], pingController.getPing)

export default router
