import express from 'express'
import chatflowsController from '../../controllers/chatflows'

const router = express.Router()

// READ
router.get(['/', '/:id'], chatflowsController.checkIfChatflowIsValidForStreaming)

export default router
