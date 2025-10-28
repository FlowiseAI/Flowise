import { WorkspaceController } from '../controllers/workspace.controller'
import { IdentityManager } from '../../IdentityManager'
import { entitled } from '../../services/entitled-router'
import { Entitlements } from '../rbac/Entitlements'
import { AuthenticationStrategy } from '../auth/AuthenticationStrategy'

const router = entitled.Router()
const workspaceController = new WorkspaceController()

router.get(
    '/',
    [Entitlements.workspace.view],
    [AuthenticationStrategy.JWT, AuthenticationStrategy.API_KEY],
    IdentityManager.checkFeatureByPlan('feat:workspaces'),
    workspaceController.read
)

router.post(
    '/',
    [Entitlements.workspace.create],
    [AuthenticationStrategy.JWT, AuthenticationStrategy.API_KEY],
    IdentityManager.checkFeatureByPlan('feat:workspaces'),
    workspaceController.create
)

// no feature flag because user with lower plan can switch to invited workspaces with higher plan
router.post('/switch', [Entitlements.unspecified], [AuthenticationStrategy.PUBLIC], workspaceController.switchWorkspace)

router.put(
    '/',
    [Entitlements.workspace.update],
    [AuthenticationStrategy.JWT, AuthenticationStrategy.API_KEY],
    IdentityManager.checkFeatureByPlan('feat:workspaces'),
    workspaceController.update
)

router.delete(
    ['/', '/:id'],
    [Entitlements.workspace.delete],
    [AuthenticationStrategy.JWT, AuthenticationStrategy.API_KEY],
    IdentityManager.checkFeatureByPlan('feat:workspaces'),
    workspaceController.delete
)

router.get(
    ['/shared', '/shared/:id'],
    [Entitlements.workspace.create],
    [AuthenticationStrategy.JWT, AuthenticationStrategy.API_KEY],
    IdentityManager.checkFeatureByPlan('feat:workspaces'),
    workspaceController.getSharedWorkspacesForItem
)
router.post(
    ['/shared', '/shared/:id'],
    [Entitlements.workspace.create],
    [AuthenticationStrategy.JWT, AuthenticationStrategy.API_KEY],
    IdentityManager.checkFeatureByPlan('feat:workspaces'),
    workspaceController.setSharedWorkspacesForItem
)

export default router
