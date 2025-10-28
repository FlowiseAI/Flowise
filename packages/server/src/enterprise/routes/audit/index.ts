import auditController from '../../controllers/audit'
import { entitled } from '../../../services/entitled-router'
import { Entitlements } from '../../rbac/Entitlements'
import { AuthenticationStrategy } from '../../auth/AuthenticationStrategy'

const router = entitled.Router()

router.post(['/', '/login-activity'], [Entitlements.loginActivity.view], [AuthenticationStrategy.JWT, AuthenticationStrategy.API_KEY], auditController.fetchLoginActivity)
router.post(['/', '/login-activity/delete'], [Entitlements.loginActivity.delete], [AuthenticationStrategy.JWT, AuthenticationStrategy.API_KEY], auditController.deleteLoginActivity)

export default router.getRouter()
