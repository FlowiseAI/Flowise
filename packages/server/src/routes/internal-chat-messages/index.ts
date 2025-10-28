import chatMessagesController from '../../controllers/chat-messages'
import { entitled } from '../../services/entitled-router'
import { Entitlements } from '../../enterprise/rbac/Entitlements'
import { AuthenticationStrategy } from '../../enterprise/auth/AuthenticationStrategy'

const router = entitled.Router()

// CREATE

// READ
router.get(['/', '/:id'], [Entitlements.unspecified], [AuthenticationStrategy.PUBLIC], chatMessagesController.getAllInternalChatMessages)

// UPDATE

// DELETE

export default router
