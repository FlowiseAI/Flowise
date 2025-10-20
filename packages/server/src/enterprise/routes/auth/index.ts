import authController from '../../controllers/auth'
import { entitled } from '../../../services/entitled-router'
import { Entitlements } from '../../rbac/Entitlements'
const router = entitled.Router()

// RBAC
router.get(['/', '/permissions'], [Entitlements.unspecified], authController.getAllPermissions)

router.get(['/sso-success'], [Entitlements.unspecified], authController.ssoSuccess)

export default router
