import express from 'express'
import * as TriggerController from '../controllers/TriggerController'
import { checkApiKey, isUserAuthenticated } from '../middlewares/auth'

const router = express.Router()

// Apply authentication middleware based on configuration
const authMiddleware = process.env.FLOWISE_USERNAME && process.env.FLOWISE_PASSWORD ? isUserAuthenticated : checkApiKey

// Trigger routes
router.get('/', authMiddleware, TriggerController.getAllTriggers)
router.get('/:id', authMiddleware, TriggerController.getTriggerById)
router.post('/', authMiddleware, TriggerController.createTrigger)
router.put('/:id', authMiddleware, TriggerController.updateTrigger)
router.delete('/:id', authMiddleware, TriggerController.deleteTrigger)

// Trigger events routes
router.get('/:id/events', authMiddleware, TriggerController.getTriggerEvents)

// Execute trigger
router.post('/:id/execute', authMiddleware, TriggerController.executeTrigger)

// Public webhook endpoint for external triggers (no authentication required)
router.post('/:id/webhook', TriggerController.handleWebhook)

export default router