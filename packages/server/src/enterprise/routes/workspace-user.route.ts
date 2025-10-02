
import { WorkspaceUserController } from '../controllers/workspace-user.controller';
import { IdentityManager } from '../../IdentityManager';
import { EntitledRouter } from '../../routes/entitled-router';

const router = entitled.Router();
const workspaceUserController = new WorkspaceUserController();

// no feature flag because user with lower plan can read invited workspaces with higher plan
router.get('/', ['public'], workspaceUserController.read);

router.post(
  '/',
  ['workspace:add-user'],
  IdentityManager.checkFeatureByPlan('feat:workspaces'),
  workspaceUserController.create
);

router.put(
  '/',
  ['workspace:add-user'],
  IdentityManager.checkFeatureByPlan('feat:workspaces'),
  workspaceUserController.update
);

router.delete(
  '/',
  ['workspace:unlink-user'],
  IdentityManager.checkFeatureByPlan('feat:workspaces'),
  workspaceUserController.delete
);

export default router.getRouter();
