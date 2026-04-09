import express from 'express'
import cors from 'cors'
import mcpEndpointController from '../../controllers/mcp-endpoint'

const router = express.Router()

// Body size limit: 1MB max for MCP JSON-RPC payloads (overrides the global 50mb limit)
router.use(express.json({ limit: '1mb', type: 'application/json' }))

// CORS: Use MCP_CORS_ORIGINS if set, otherwise allow only non-browser (no Origin header) requests.
// MCP desktop clients (Claude Desktop, Cursor, etc.) don't send an Origin header, so they pass through.
// Browser-based clients are restricted to the configured origins.
const mcpCorsOrigins = process.env.MCP_CORS_ORIGINS
const mcpCorsOptions: cors.CorsOptions = {
    origin: mcpCorsOrigins
        ? mcpCorsOrigins === '*'
            ? true
            : mcpCorsOrigins.split(',').map((o) => o.trim())
        : (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
              // No origin header (desktop/server-to-server) → allow
              // Browser origin → deny (no allowed list configured)
              callback(null, !origin)
          },
    methods: ['GET', 'POST', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    maxAge: 86400
}
router.use(cors(mcpCorsOptions))
// Handle preflight for all MCP routes
router.options('/:chatflowId', cors(mcpCorsOptions))

// MCP Streamable HTTP protocol routes (protocol version 2025-03-26)
// Auth: token must be provided via Authorization: Bearer <token> header
// POST — JSON-RPC messages (initialize, tools/list, tools/call, etc.)
router.post(
    '/:chatflowId',
    mcpEndpointController.getRateLimiterMiddleware,
    mcpEndpointController.authenticateToken,
    mcpEndpointController.handlePost
)

// DELETE — Session termination (stateless mode returns 405)
router.delete('/:chatflowId', mcpEndpointController.handleDelete)

export default router
