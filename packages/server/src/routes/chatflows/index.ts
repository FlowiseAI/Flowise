import express from 'express'
import chatflowsController from '../../controllers/chatflows'
const router = express.Router()

// CREATE

// READ
router.get('/', chatflowsController.getAllChatflows)

// UPDATE

// DELETE

export default router
