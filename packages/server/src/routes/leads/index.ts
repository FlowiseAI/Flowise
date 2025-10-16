import leadsController from '../../controllers/leads'
import { entitled } from '../../services/entitled-router'
import { Entitlements } from '../../enterprise/rbac/Entitlements'
const router = entitled.Router()

// CREATE
router.post('/', [Entitlements.unspecified], leadsController.createLeadInChatflow)

// READ
router.get(['/', '/:id'], [Entitlements.unspecified], leadsController.getAllLeadsForChatflow)

export default router
