import { WorkspaceUserController } from '../controllers/workspace-user.controller'
import { IdentityManager } from '../../IdentityManager'
import { entitled } from '../../services/entitled-router'
import { Entitlements } from '../rbac/Entitlements'

const router = entitled.Router()
const workspaceUserController = new WorkspaceUserController()

// no feature flag because user with lower plan can read invited workspaces with higher plan
router.get('/', [Entitlements.unspecified], workspaceUserController.read)

router.post('/', [Entitlements.workspace.addUser], IdentityManager.checkFeatureByPlan('feat:workspaces'), workspaceUserController.create)

router.put('/', [Entitlements.workspace.addUser], IdentityManager.checkFeatureByPlan('feat:workspaces'), workspaceUserController.update)

router.delete(
    '/',
    [Entitlements.workspace.unlinkUser],
    IdentityManager.checkFeatureByPlan('feat:workspaces'),
    workspaceUserController.delete
)

export default router.getRouter()
