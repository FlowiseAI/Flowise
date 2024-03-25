import express from 'express'
import chatflowsController from '../../controllers/chatflows'
const router = express.Router()

// CREATE
router.post('/', chatflowsController.saveChatflow)

// READ
router.get('/', chatflowsController.getAllChatflows)
router.get('/:id', chatflowsController.getChatflowById)

// UPDATE

// DELETE
router.delete('/:id', chatflowsController.deleteChatflow)

export default router
