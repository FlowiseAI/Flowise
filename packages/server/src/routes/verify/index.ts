import apikeyController from '../../controllers/apikey'
import { entitled } from '../../services/entitled-router'
import { Entitlements } from '../../enterprise/rbac/Entitlements'
const router = entitled.Router()

// READ
router.get(['/apikey/', '/apikey/:apikey'], [Entitlements.unspecified], apikeyController.verifyApiKey)

export default router
