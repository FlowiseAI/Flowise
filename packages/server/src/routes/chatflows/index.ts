import express from 'express'
import chatflowsController from '../../controllers/chatflows'
import { checkAnyPermission } from '../../enterprise/rbac/PermissionCheck'
const router = express.Router()

// CREATE
router.post(
    '/',
    checkAnyPermission('chatflows:create,chatflows:update,agentflows:create,agentflows:update'),
    chatflowsController.saveChatflow
)

// READ
router.get(
    '/',
    checkAnyPermission('chatflows:view,chatflows:update,agentflows:view,agentflows:update'),
    chatflowsController.getAllChatflows
)
router.get(
    ['/', '/:id'],
    checkAnyPermission('chatflows:view,chatflows:update,chatflows:delete,agentflows:view,agentflows:update,agentflows:delete'),
    chatflowsController.getChatflowById
)
router.get(['/apikey/', '/apikey/:apikey'], chatflowsController.getChatflowByApiKey)

// UPDATE
router.put(
    ['/', '/:id'],
    checkAnyPermission('chatflows:create,chatflows:update,agentflows:create,agentflows:update'),
    chatflowsController.updateChatflow
)

// DELETE
router.delete(['/', '/:id'], checkAnyPermission('chatflows:delete,agentflows:delete'), chatflowsController.deleteChatflow)

// WEBHOOK SECRET
router.post('/:id/webhook-secret', checkAnyPermission('chatflows:update,agentflows:update'), chatflowsController.setWebhookSecret)
router.delete('/:id/webhook-secret', checkAnyPermission('chatflows:update,agentflows:update'), chatflowsController.clearWebhookSecret)

// CHECK FOR CHANGE
router.get(
    '/has-changed/:id/:lastUpdatedDateTime',
    checkAnyPermission('chatflows:update,agentflows:update'),
    chatflowsController.checkIfChatflowHasChanged
)

// SCHEDULE
router.get(
    '/:id/schedule/status',
    checkAnyPermission('chatflows:view,chatflows:update,agentflows:view,agentflows:update'),
    chatflowsController.getScheduleStatus
)
router.patch('/:id/schedule/enabled', checkAnyPermission('chatflows:update,agentflows:update'), chatflowsController.toggleScheduleEnabled)
router.get(
    '/:id/schedule/trigger-logs',
    checkAnyPermission('chatflows:view,chatflows:update,agentflows:view,agentflows:update'),
    chatflowsController.getScheduleTriggerLogs
)
router.delete(
    '/:id/schedule/trigger-logs',
    checkAnyPermission('chatflows:update,agentflows:update,executions:delete'),
    chatflowsController.deleteScheduleTriggerLogs
)

export default router
