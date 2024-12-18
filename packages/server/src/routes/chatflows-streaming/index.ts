import express, { Router } from 'express'
import chatflowsController from '../../controllers/chatflows'

const router: Router = express.Router()

// READ
router.get(['/', '/:id'], chatflowsController.checkIfChatflowIsValidForStreaming)

export default router
