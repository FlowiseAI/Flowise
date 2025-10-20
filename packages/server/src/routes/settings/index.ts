import settingsController from '../../controllers/settings'
import { entitled } from '../../services/entitled-router'
import { Entitlements } from '../../enterprise/rbac/Entitlements'
const router = entitled.Router()

// CREATE
router.get('/', [Entitlements.unspecified], settingsController.getSettingsList)

export default router
