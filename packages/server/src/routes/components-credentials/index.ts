import componentsCredentialsController from '../../controllers/components-credentials'
import { entitled } from '../../services/entitled-router'
import { Entitlements } from '../../enterprise/rbac/Entitlements'
import { AuthenticationStrategy } from '../../enterprise/auth/AuthenticationStrategy'

const router = entitled.Router()

// READ
router.get('/', [Entitlements.unspecified], [AuthenticationStrategy.PUBLIC], componentsCredentialsController.getAllComponentsCredentials)
router.get(['/', '/:name'], [Entitlements.unspecified], [AuthenticationStrategy.PUBLIC], componentsCredentialsController.getComponentByName)

export default router
