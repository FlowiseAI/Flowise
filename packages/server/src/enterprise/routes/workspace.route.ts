import { WorkspaceController } from '../controllers/workspace.controller'
import { IdentityManager } from '../../IdentityManager'
import { EntitledRouter } from '../../routes/entitled-router'

const router = new EntitledRouter()
const workspaceController = new WorkspaceController()

router.get('/', ['workspace:view'], IdentityManager.checkFeatureByPlan('feat:workspaces'), workspaceController.read)

router.post('/', ['workspace:create'], IdentityManager.checkFeatureByPlan('feat:workspaces'), workspaceController.create)

// no feature flag because user with lower plan can switch to invited workspaces with higher plan
router.post('/switch', ['public'], workspaceController.switchWorkspace)

router.put('/', ['workspace:update'], IdentityManager.checkFeatureByPlan('feat:workspaces'), workspaceController.update)

router.delete(['/', '/:id'], ['workspace:delete'], IdentityManager.checkFeatureByPlan('feat:workspaces'), workspaceController.delete)

router.get(
    ['/shared', '/shared/:id'],
    ['workspace:create'],
    IdentityManager.checkFeatureByPlan('feat:workspaces'),
    workspaceController.getSharedWorkspacesForItem
)
router.post(
    ['/shared', '/shared/:id'],
    ['workspace:create'],
    IdentityManager.checkFeatureByPlan('feat:workspaces'),
    workspaceController.setSharedWorkspacesForItem
)

export default router.getRouter()
