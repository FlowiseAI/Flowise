import { OrganizationUserController } from '../controllers/organization-user.controller'
import { IdentityManager } from '../../IdentityManager'
import { EntitledRouter } from '../../routes/entitled-router'

const router = new EntitledRouter()
const organizationUserController = new OrganizationUserController()

router.get('/', ['public'], organizationUserController.read)

router.post('/', ['users:manage'], IdentityManager.checkFeatureByPlan('feat:users'), organizationUserController.create)

router.put('/', ['users:manage'], IdentityManager.checkFeatureByPlan('feat:users'), organizationUserController.update)

router.delete('/', ['users:manage'], IdentityManager.checkFeatureByPlan('feat:users'), organizationUserController.delete)

export default router.getRouter()
