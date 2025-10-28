import logController from '../../controllers/log'
import { entitled } from '../../services/entitled-router'
import { Entitlements } from '../../enterprise/rbac/Entitlements'
import { AuthenticationStrategy } from '../../enterprise/auth/AuthenticationStrategy'

const router = entitled.Router()

// READ
router.get('/', [Entitlements.logs.view], [AuthenticationStrategy.JWT, AuthenticationStrategy.API_KEY], logController.getLogs)

export default router.getRouter()
