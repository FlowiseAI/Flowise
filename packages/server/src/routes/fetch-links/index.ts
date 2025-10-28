import fetchLinksController from '../../controllers/fetch-links'
import { entitled } from '../../services/entitled-router'
import { Entitlements } from '../../enterprise/rbac/Entitlements'
import { AuthenticationStrategy } from '../../enterprise/auth/AuthenticationStrategy'

const router = entitled.Router()

// READ
router.get('/', [Entitlements.unspecified], [AuthenticationStrategy.PUBLIC], fetchLinksController.getAllLinks)

export default router
