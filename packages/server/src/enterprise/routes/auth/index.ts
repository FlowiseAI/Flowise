import authController from '../../controllers/auth'
import { entitled } from '../../../services/entitled-router'
import { Entitlements } from '../../rbac/Entitlements'
import { AuthenticationStrategy } from '../../auth/AuthenticationStrategy'

const router = entitled.Router()

// RBAC
router.get(['/', '/permissions'], [Entitlements.unspecified], [AuthenticationStrategy.PUBLIC], authController.getAllPermissions)

router.get(['/sso-success'], [Entitlements.unspecified], [AuthenticationStrategy.PUBLIC], authController.ssoSuccess)

export default router
