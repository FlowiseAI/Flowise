import componentsCredentialsController from '../../controllers/components-credentials'
import { entitled } from '../../services/entitled-router'
import { Entitlements } from '../../enterprise/rbac/Entitlements'
const router = entitled.Router()

// CREATE

// READ
router.get(['/', '/:name'], [Entitlements.unspecified], componentsCredentialsController.getSingleComponentsCredentialIcon)

// UPDATE

// DELETE

export default router
