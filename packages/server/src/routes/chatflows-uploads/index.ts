import chatflowsController from '../../controllers/chatflows'
import { entitled } from '../../services/entitled-router'
import { Entitlements } from '../../enterprise/rbac/Entitlements'
import { AuthenticationStrategy } from '../../enterprise/auth/AuthenticationStrategy'

const router = entitled.Router()

// READ
router.get(['/', '/:id'], [Entitlements.unspecified], [AuthenticationStrategy.PUBLIC], chatflowsController.checkIfChatflowIsValidForUploads)

export default router.getRouter()
