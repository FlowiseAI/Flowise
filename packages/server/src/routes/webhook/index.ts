import express from 'express'
import webhookController from '../../controllers/webhook'

const router = express.Router()

// Unauthenticated at route level — API key validation happens downstream in utilBuildChatflow.
// Method filtering (GET/POST/etc.) TODO: will be enforced in the service once the Start node config is read.
router.all('/:id', webhookController.getRateLimiterMiddleware, webhookController.createWebhook)

export default router
