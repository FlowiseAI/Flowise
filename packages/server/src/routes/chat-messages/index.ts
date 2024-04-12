import express from 'express'
import chatMessageController from '../../controllers/chat-messages'
const router = express.Router()

// CREATE
router.post(['/', '/:id'], chatMessageController.createChatMessage)

// READ
router.get(['/', '/:id'], chatMessageController.getAllChatMessages)

// UPDATE

// DELETE
router.delete(['/', '/:id'], chatMessageController.removeAllChatMessages)

export default router
