import express from 'express'
import cors from 'cors'
import a2aController from '../../controllers/a2a'

const router = express.Router()

// Body size limit: 10MB max for A2A JSON-RPC payloads
router.use(express.json({ limit: '10mb', type: 'application/json' }))

// CORS: Allow all origins for A2A agent-to-agent communication
// Can be restricted via A2A_CORS_ORIGINS env var
const a2aCorsOrigins = process.env.A2A_CORS_ORIGINS
const a2aCorsOptions: cors.CorsOptions = {
    origin: a2aCorsOrigins
        ? a2aCorsOrigins === '*'
            ? true
            : a2aCorsOrigins.split(',').map((o) => o.trim())
        : true,
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    maxAge: 86400
}
router.use(cors(a2aCorsOptions))

// Handle preflight for all A2A routes
router.options('/:chatflowId', a2aController.handleOptions)

// GET /.well-known/agent-card.json for a specific chatflow
// AgentCard discovery endpoint
router.get(
    '/:chatflowId',
    a2aController.authenticateToken,
    a2aController.handleAgentCard
)

// POST — A2A JSON-RPC messages (tasks/send, tasks/sendSubscribe, tasks/get, tasks/cancel)
router.post(
    '/:chatflowId',
    a2aController.getRateLimiterMiddleware,
    a2aController.authenticateToken,
    a2aController.handlePost
)

export default router
