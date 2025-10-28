import { RoleController } from '../controllers/role.controller'
import { entitled } from '../../services/entitled-router'
import { Entitlements } from '../rbac/Entitlements'
import { AuthenticationStrategy } from '../auth/AuthenticationStrategy'

const router = entitled.Router()
const roleController = new RoleController()

router.get('/', [Entitlements.unspecified], [AuthenticationStrategy.PUBLIC], roleController.read)

router.post('/', [Entitlements.roles.manage], [AuthenticationStrategy.JWT, AuthenticationStrategy.API_KEY], roleController.create)

router.put('/', [Entitlements.roles.manage], [AuthenticationStrategy.JWT, AuthenticationStrategy.API_KEY], roleController.update)

router.delete('/', [Entitlements.roles.manage], [AuthenticationStrategy.JWT, AuthenticationStrategy.API_KEY], roleController.delete)

export default router.getRouter()
