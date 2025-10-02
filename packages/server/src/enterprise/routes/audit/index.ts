
import auditController from '../../controllers/audit';
import { EntitledRouter } from '../../utils/EntitledRouter';

const router = entitled.Router();

router.post(['/', '/login-activity'], ['loginActivity:view'], auditController.fetchLoginActivity);
router.post(['/', '/login-activity/delete'], ['loginActivity:delete'], auditController.deleteLoginActivity);

export default router.getRouter();
