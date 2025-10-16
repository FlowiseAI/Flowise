import { RoleController } from '../controllers/role.controller'
import { entitled } from '../../services/entitled-router'
import { Entitlements } from '../rbac/Entitlements'

const router = entitled.Router()
const roleController = new RoleController()

router.get('/', [Entitlements.unspecified], roleController.read)

router.post('/', [Entitlements.roles.manage], roleController.create)

router.put('/', [Entitlements.roles.manage], roleController.update)

router.delete('/', [Entitlements.roles.manage], roleController.delete)

export default router.getRouter()
