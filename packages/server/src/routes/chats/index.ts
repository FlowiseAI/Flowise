import express from 'express'
import chatsController from '../../controllers/chats'

const router = express.Router()

// READ
router.get('/', chatsController.getAllChats)
router.get('/:id', chatsController.getChatById)

export default router
