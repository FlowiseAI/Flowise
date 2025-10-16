import express from 'express'
import chatMessagesController from '../../controllers/chat-messages'
const router = entitled.Router()

// CREATE

// READ
router.get(['/', '/:id'], chatMessagesController.getAllInternalChatMessages)

// UPDATE

// DELETE

export default router
