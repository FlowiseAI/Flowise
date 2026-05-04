import express from 'express'
import webhookListenerController from '../../controllers/webhook-listener'

const router = express.Router()

// Listener lifecycle: register a listenerId, open an SSE stream for it, then unregister on close.
router.post('/:id/register', webhookListenerController.registerListener)
router.get('/:id/stream/:listenerId', webhookListenerController.streamListener)
router.delete('/:id/listener/:listenerId', webhookListenerController.unregisterListener)

export default router
