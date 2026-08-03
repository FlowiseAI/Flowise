import express from 'express'
import webhookController from '../../controllers/webhook'

const router = express.Router()

// Unauthenticated at route level — API key validation happens downstream in utilBuildChatflow.
router.all('/:id', webhookController.getRateLimiterMiddleware, webhookController.createWebhook)

export default router
