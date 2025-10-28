import { OrganizationUserController } from '../controllers/organization-user.controller'
import { IdentityManager } from '../../IdentityManager'
import { entitled } from '../../services/entitled-router'
import { Entitlements } from '../rbac/Entitlements'
import { AuthenticationStrategy } from '../auth/AuthenticationStrategy'

const router = entitled.Router()
const organizationUserController = new OrganizationUserController()

router.get('/', [Entitlements.unspecified], [AuthenticationStrategy.PUBLIC], organizationUserController.read)

router.post(
    '/',
    [Entitlements.users.manage],
    [AuthenticationStrategy.JWT, AuthenticationStrategy.API_KEY],
    IdentityManager.checkFeatureByPlan('feat:users'),
    organizationUserController.create
)

router.put(
    '/',
    [Entitlements.users.manage],
    [AuthenticationStrategy.JWT, AuthenticationStrategy.API_KEY],
    IdentityManager.checkFeatureByPlan('feat:users'),
    organizationUserController.update
)

router.delete(
    '/',
    [Entitlements.users.manage],
    [AuthenticationStrategy.JWT, AuthenticationStrategy.API_KEY],
    IdentityManager.checkFeatureByPlan('feat:users'),
    organizationUserController.delete
)

export default router
