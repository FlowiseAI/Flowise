import express, { Router } from 'express'
import chatMessagesController from '../../controllers/chat-messages'
const router: Router = express.Router()

// CREATE

// READ
router.get(['/', '/:id'], chatMessagesController.getAllInternalChatMessages)

// UPDATE

// DELETE

export default router
