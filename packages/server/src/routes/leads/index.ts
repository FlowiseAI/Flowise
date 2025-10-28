import leadsController from '../../controllers/leads'
import { entitled } from '../../services/entitled-router'
import { Entitlements } from '../../enterprise/rbac/Entitlements'
import { AuthenticationStrategy } from '../../enterprise/auth/AuthenticationStrategy'

const router = entitled.Router()

// CREATE
router.post('/', [Entitlements.unspecified], [AuthenticationStrategy.PUBLIC], leadsController.createLeadInChatflow)

// READ
router.get(['/', '/:id'], [Entitlements.unspecified], [AuthenticationStrategy.PUBLIC], leadsController.getAllLeadsForChatflow)

export default router.getRouter()
