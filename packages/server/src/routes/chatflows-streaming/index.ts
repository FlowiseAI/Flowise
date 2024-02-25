import express from 'express'
import chatflowsController from '../../controllers/chatflows'
const router = express.Router()

// CREATE

// READ
router.get('/:id', chatflowsController.chatflowValidForStreaming)

// UPDATE

// DELETE

export default router
