import auditController from '../../controllers/audit'
import { entitled } from '../../../services/entitled-router'
import { Entitlements } from '../../rbac/Entitlements'

const router = entitled.Router()

router.post(['/', '/login-activity'], [Entitlements.loginActivity.view], auditController.fetchLoginActivity)
router.post(['/', '/login-activity/delete'], [Entitlements.loginActivity.delete], auditController.deleteLoginActivity)

export default router
