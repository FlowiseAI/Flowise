import express from 'express'
import mcpServerController from '../../controllers/mcp-server'
const router = express.Router()

// GET    /api/v1/chatflows-mcp-server/:id     → get current config
router.get('/:id', mcpServerController.getMcpServerConfig)

// POST   /api/v1/chatflows-mcp-server/:id       → enable (generates token)
router.post('/:id', mcpServerController.createMcpServerConfig)

// PUT    /api/v1/chatflows-mcp-server/:id         → update description/toolName/status
router.put('/:id', mcpServerController.updateMcpServerConfig)

// DELETE /api/v1/chatflows-mcp-server/:id         → disable (set enabled=false)
router.delete('/:id', mcpServerController.deleteMcpServerConfig)

// POST   /api/v1/chatflows-mcp-server/:id/refresh → rotate token
router.post('/:id/refresh', mcpServerController.refreshMcpToken)

export default router
