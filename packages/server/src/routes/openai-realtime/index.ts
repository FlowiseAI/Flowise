import express from 'express'
import openaiRealTimeController from '../../controllers/openai-realtime'
import { checkAnyPermission } from '../../enterprise/rbac/PermissionCheck'

const router = express.Router()

// GET
router.get(
    ['/', '/:id'],
    checkAnyPermission('chatflows:view,chatflows:create,chatflows:update,chatflows:delete'),
    openaiRealTimeController.getAgentTools
)

// EXECUTE
router.post(
    ['/', '/:id'],
    checkAnyPermission('chatflows:view,chatflows:create,chatflows:update,chatflows:delete'),
    openaiRealTimeController.executeAgentTool
)

export default router
