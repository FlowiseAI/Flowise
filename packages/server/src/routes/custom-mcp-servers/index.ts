import express from 'express'
import customMcpServersController from '../../controllers/custom-mcp-servers'
import { checkAnyPermission, checkPermission } from '../../enterprise/rbac/PermissionCheck'

const router = express.Router()

// CREATE
router.post('/', checkPermission('tools:create'), customMcpServersController.createCustomMcpServer)

// READ
router.get('/', checkPermission('tools:view'), customMcpServersController.getAllCustomMcpServers)
router.get('/:id', checkPermission('tools:view'), customMcpServersController.getCustomMcpServerById)
router.get('/:id/tools', checkPermission('tools:view'), customMcpServersController.getDiscoveredTools)

// UPDATE
router.put('/:id', checkAnyPermission('tools:update,tools:create'), customMcpServersController.updateCustomMcpServer)

// AUTHORIZE (connect to server & discover tools)
router.post('/:id/authorize', checkAnyPermission('tools:update,tools:create'), customMcpServersController.authorizeCustomMcpServer)

// DELETE
router.delete('/:id', checkPermission('tools:delete'), customMcpServersController.deleteCustomMcpServer)

export default router
