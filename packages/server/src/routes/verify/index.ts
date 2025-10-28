import apikeyController from '../../controllers/apikey'
import { entitled } from '../../services/entitled-router'
import { Entitlements } from '../../enterprise/rbac/Entitlements'
import { AuthenticationStrategy } from '../../enterprise/auth/AuthenticationStrategy'

const router = entitled.Router()

// READ
router.get(['/apikey/', '/apikey/:apikey'], [Entitlements.unspecified], [AuthenticationStrategy.PUBLIC], apikeyController.verifyApiKey)

export default router.getRouter()
