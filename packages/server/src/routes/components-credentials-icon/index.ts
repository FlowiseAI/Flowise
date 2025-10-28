import componentsCredentialsController from '../../controllers/components-credentials'
import { entitled } from '../../services/entitled-router'
import { Entitlements } from '../../enterprise/rbac/Entitlements'
import { AuthenticationStrategy } from '../../enterprise/auth/AuthenticationStrategy'

const router = entitled.Router()

// CREATE

// READ
router.get(
    ['/', '/:name'],
    [Entitlements.unspecified],
    [AuthenticationStrategy.PUBLIC],
    componentsCredentialsController.getSingleComponentsCredentialIcon
)

// UPDATE

// DELETE

export default router.getRouter()
