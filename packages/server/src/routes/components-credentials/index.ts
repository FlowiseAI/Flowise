import componentsCredentialsController from '../../controllers/components-credentials'
import { entitled } from '../../services/entitled-router'
import { Entitlements } from '../../enterprise/rbac/Entitlements'
const router = entitled.Router()

// READ
router.get('/', [Entitlements.unspecified], componentsCredentialsController.getAllComponentsCredentials)
router.get(['/', '/:name'], [Entitlements.unspecified], componentsCredentialsController.getComponentByName)

export default router
