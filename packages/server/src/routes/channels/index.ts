import express from 'express'
import channelsController from '../../controllers/channels'
import { checkAnyPermission } from '../../enterprise/rbac/PermissionCheck'

const router = express.Router()

router.post(
    '/accounts',
    checkAnyPermission('credentials:create,credentials:update,chatflows:config,agentflows:config'),
    channelsController.createChannelAccount
)
router.get('/accounts', checkAnyPermission('credentials:view,chatflows:view,agentflows:view'), channelsController.getAllChannelAccounts)
router.put(
    '/accounts/:id',
    checkAnyPermission('credentials:update,chatflows:config,agentflows:config'),
    channelsController.updateChannelAccount
)
router.delete(
    '/accounts/:id',
    checkAnyPermission('credentials:delete,chatflows:config,agentflows:config'),
    channelsController.deleteChannelAccount
)

router.post('/bindings', checkAnyPermission('chatflows:config,agentflows:config'), channelsController.createAgentChannelBinding)
router.get('/bindings', checkAnyPermission('chatflows:view,agentflows:view'), channelsController.getAgentChannelBindings)
router.put('/bindings/:id', checkAnyPermission('chatflows:config,agentflows:config'), channelsController.updateAgentChannelBinding)
router.delete('/bindings/:id', checkAnyPermission('chatflows:config,agentflows:config'), channelsController.deleteAgentChannelBinding)

export default router
