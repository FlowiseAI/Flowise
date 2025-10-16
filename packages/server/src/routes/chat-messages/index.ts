import chatMessageController from '../../controllers/chat-messages'
import { entitled } from '../../services/entitled-router'
import { Entitlements } from '../../enterprise/rbac/Entitlements'

const router = entitled.Router()

// CREATE
router.post(['/', '/:id'], [Entitlements.unspecified], chatMessageController.createChatMessage)

// READ
router.get(['/', '/:id'], [Entitlements.unspecified], chatMessageController.getAllChatMessages)

// UPDATE
router.put(['/abort/', '/abort/:chatflowid/:chatid'], [Entitlements.unspecified], chatMessageController.abortChatMessage)

// DELETE
router.delete(['/', '/:id'], [Entitlements.unspecified], chatMessageController.removeAllChatMessages)

export default router
