import express from 'express'
import chatflowsController from '../../controllers/chatflows'
const router = express.Router()

// CREATE

// READ
router.get('/', chatflowsController.getAllChatflows)
router.get('/:id', chatflowsController.getChatflowById)

// UPDATE

// DELETE

export default router
