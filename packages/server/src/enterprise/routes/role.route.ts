
import { RoleController } from '../controllers/role.controller';
import { EntitledRouter } from '../../routes/entitled-router';

const router = entitled.Router();
const roleController = new RoleController();

router.get('/', ['public'], roleController.read);

router.post('/', ['roles:manage'], roleController.create);

router.put('/', ['roles:manage'], roleController.update);

router.delete('/', ['roles:manage'], roleController.delete);

export default router.getRouter();
