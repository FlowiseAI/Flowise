import { OrganizationUserController } from '../controllers/organization-user.controller'
import { IdentityManager } from '../../IdentityManager'
import { entitled } from '../../services/entitled-router'
import { Entitlements } from '../rbac/Entitlements'

const router = entitled.Router()
const organizationUserController = new OrganizationUserController()

router.get('/', [Entitlements.unspecified], organizationUserController.read)

router.post('/', [Entitlements.users.manage], IdentityManager.checkFeatureByPlan('feat:users'), organizationUserController.create)

router.put('/', [Entitlements.users.manage], IdentityManager.checkFeatureByPlan('feat:users'), organizationUserController.update)

router.delete('/', [Entitlements.users.manage], IdentityManager.checkFeatureByPlan('feat:users'), organizationUserController.delete)

export default router
