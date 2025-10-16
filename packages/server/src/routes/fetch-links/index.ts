import fetchLinksController from '../../controllers/fetch-links'
import { entitled } from '../../services/entitled-router'
import { Entitlements } from '../../enterprise/rbac/Entitlements'
const router = entitled.Router()

// READ
router.get('/', [Entitlements.unspecified], fetchLinksController.getAllLinks)

export default router
