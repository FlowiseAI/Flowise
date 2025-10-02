import chatMessageController from '../../controllers/chat-messages'
import { entitled } from '../../services/entitled-router'

const router = entitled.Router()

// CREATE
router.post(['/', '/:id'], ['public'], chatMessageController.createChatMessage)

// READ
router.get(['/', '/:id'], ['public'], chatMessageController.getAllChatMessages)

// UPDATE
router.put(['/abort/', '/abort/:chatflowid/:chatid'], ['public'], chatMessageController.abortChatMessage)

// DELETE
router.delete(['/', '/:id'], ['public'], chatMessageController.removeAllChatMessages)

export default router.getRouter()
