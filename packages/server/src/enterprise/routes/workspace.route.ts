import express from 'express'
import { WorkspaceController } from '../controllers/workspace.controller'
import { IdentityManager } from '../../IdentityManager'
import { checkPermission } from '../rbac/PermissionCheck'

const router = express.Router()
const workspaceController = new WorkspaceController()

router.get('/', IdentityManager.checkFeatureByPlan('feat:workspaces'), checkPermission('workspace:view'), workspaceController.read)

router.post('/', IdentityManager.checkFeatureByPlan('feat:workspaces'), checkPermission('workspace:create'), workspaceController.create)

// no feature flag because user with lower plan can switch to invited workspaces with higher plan
router.post('/switch', workspaceController.switchWorkspace)

router.put('/', IdentityManager.checkFeatureByPlan('feat:workspaces'), checkPermission('workspace:update'), workspaceController.update)

router.delete(
    ['/', '/:id'],
    IdentityManager.checkFeatureByPlan('feat:workspaces'),
    checkPermission('workspace:delete'),
    workspaceController.delete
)

router.get(
    ['/shared', '/shared/:id'],
    IdentityManager.checkFeatureByPlan('feat:workspaces'),
    checkPermission('workspace:create'),
    workspaceController.getSharedWorkspacesForItem
)
router.post(
    ['/shared', '/shared/:id'],
    IdentityManager.checkFeatureByPlan('feat:workspaces'),
    checkPermission('workspace:create'),
    workspaceController.setSharedWorkspacesForItem
)

export default router
