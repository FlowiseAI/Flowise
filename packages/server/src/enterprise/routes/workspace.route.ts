import { WorkspaceController } from '../controllers/workspace.controller'
import { IdentityManager } from '../../IdentityManager'
import { entitled } from '../../services/entitled-router'
import { Entitlements } from '../rbac/Entitlements'

const router = entitled.Router()
const workspaceController = new WorkspaceController()

router.get('/', [Entitlements.workspace.view], IdentityManager.checkFeatureByPlan('feat:workspaces'), workspaceController.read)

router.post('/', [Entitlements.workspace.create], IdentityManager.checkFeatureByPlan('feat:workspaces'), workspaceController.create)

// no feature flag because user with lower plan can switch to invited workspaces with higher plan
router.post('/switch', [Entitlements.unspecified], workspaceController.switchWorkspace)

router.put('/', [Entitlements.workspace.update], IdentityManager.checkFeatureByPlan('feat:workspaces'), workspaceController.update)

router.delete(
    ['/', '/:id'],
    [Entitlements.workspace.delete],
    IdentityManager.checkFeatureByPlan('feat:workspaces'),
    workspaceController.delete
)

router.get(
    ['/shared', '/shared/:id'],
    [Entitlements.workspace.create],
    IdentityManager.checkFeatureByPlan('feat:workspaces'),
    workspaceController.getSharedWorkspacesForItem
)
router.post(
    ['/shared', '/shared/:id'],
    [Entitlements.workspace.create],
    IdentityManager.checkFeatureByPlan('feat:workspaces'),
    workspaceController.setSharedWorkspacesForItem
)

export default router
