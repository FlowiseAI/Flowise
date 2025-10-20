import chatMessagesController from '../../controllers/chat-messages'
import { entitled } from '../../services/entitled-router'
import { Entitlements } from '../../enterprise/rbac/Entitlements'
const router = entitled.Router()

// CREATE

// READ
router.get(['/', '/:id'], [Entitlements.unspecified], chatMessagesController.getAllInternalChatMessages)

// UPDATE

// DELETE

export default router
