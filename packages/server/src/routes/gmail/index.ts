import express from 'express'
import gmailController from '../../controllers/gmail'

const router = express.Router()

// Routes for Gmail operations
router.get('/labels', gmailController.getLabels)
router.post('/labels', gmailController.getLabels) // Support both GET and POST
router.get('/messages', gmailController.getMessages)
router.post('/messages', gmailController.getMessages) // Support both GET and POST
router.get('/message/:messageId', gmailController.getMessage)
router.post('/message', gmailController.getMessage) // Alternative with POST body

export default router
