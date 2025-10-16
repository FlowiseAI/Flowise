import chatflowsController from '../../controllers/chatflows'
import { entitled } from '../../services/entitled-router'
import { Entitlements } from '../../enterprise/rbac/Entitlements'

const router = entitled.Router()

// READ
router.get(['/', '/:id'], [Entitlements.unspecified], chatflowsController.getSinglePublicChatbotConfig)

export default router.getRouter()
