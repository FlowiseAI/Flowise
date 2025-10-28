import settingsController from '../../controllers/settings'
import { entitled } from '../../services/entitled-router'
import { Entitlements } from '../../enterprise/rbac/Entitlements'
import { AuthenticationStrategy } from '../../enterprise/auth/AuthenticationStrategy'

const router = entitled.Router()

// CREATE
router.get('/', [Entitlements.unspecified], [AuthenticationStrategy.PUBLIC], settingsController.getSettingsList)

export default router.getRouter()
