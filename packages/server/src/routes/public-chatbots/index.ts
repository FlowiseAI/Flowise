import express, { Router } from 'express'
import chatflowsController from '../../controllers/chatflows'
const router: Router = express.Router()

// CREATE

// READ
router.get(['/', '/:id'], chatflowsController.getSinglePublicChatbotConfig)

// UPDATE

// DELETE

export default router
