import express from 'express'
import chatMessageController from '../../controllers/chat-messages'
const router = express.Router()

// READ
router.get(['/', '/:id'], chatMessageController.getPublicChatMessages)

export default router
