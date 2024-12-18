import express, { Router } from 'express'
import feedbackController from '../../controllers/feedback'
const router: Router = express.Router()

// CREATE
router.post(['/', '/:id'], feedbackController.createChatMessageFeedbackForChatflow)

// READ
router.get(['/', '/:id'], feedbackController.getAllChatMessageFeedback)

// UPDATE
router.put(['/', '/:id'], feedbackController.updateChatMessageFeedbackForChatflow)

export default router
