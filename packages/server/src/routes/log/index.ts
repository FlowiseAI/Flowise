import logController from '../../controllers/log'
import { entitled } from '../../services/entitled-router'
import { Entitlements } from '../../enterprise/rbac/Entitlements'

const router = entitled.Router()

// READ
router.get('/', [Entitlements.logs.view], logController.getLogs)

export default router
