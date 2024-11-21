import express from 'express'
import chatsController from '../../controllers/chats'
import enforceAbility from '../../middlewares/authentication/enforceAbility'

const router = express.Router()

// READ
router.get('/', chatsController.getAllChats)

export default router
