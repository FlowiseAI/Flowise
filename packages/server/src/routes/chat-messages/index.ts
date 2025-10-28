import chatMessageController from '../../controllers/chat-messages'
import { entitled } from '../../services/entitled-router'
import { Entitlements } from '../../enterprise/rbac/Entitlements'
import { AuthenticationStrategy } from '../../enterprise/auth/AuthenticationStrategy'

const router = entitled.Router()

// CREATE
router.post(['/', '/:id'], [Entitlements.unspecified], [AuthenticationStrategy.PUBLIC], chatMessageController.createChatMessage)

// READ
router.get(['/', '/:id'], [Entitlements.unspecified], [AuthenticationStrategy.PUBLIC], chatMessageController.getAllChatMessages)

// UPDATE
router.put(['/abort/', '/abort/:chatflowid/:chatid'], [Entitlements.unspecified], [AuthenticationStrategy.PUBLIC], chatMessageController.abortChatMessage)

// DELETE
router.delete(['/', '/:id'], [Entitlements.unspecified], [AuthenticationStrategy.PUBLIC], chatMessageController.removeAllChatMessages)

export default router.getRouter()
