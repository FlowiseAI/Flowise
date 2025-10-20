import versionsController from '../../controllers/versions'
import { entitled } from '../../services/entitled-router'
import { Entitlements } from '../../enterprise/rbac/Entitlements'
const router = entitled.Router()

// READ
router.get('/', [Entitlements.unspecified], versionsController.getVersion)

export default router
