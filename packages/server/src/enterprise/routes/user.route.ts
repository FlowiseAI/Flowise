import { UserController } from '../controllers/user.controller'
import { entitled } from '../../services/entitled-router'
import { Entitlements } from '../rbac/Entitlements'

const router = entitled.Router()
const userController = new UserController()

router.get('/', [Entitlements.unspecified], userController.read)
router.get('/test', [Entitlements.unspecified], userController.test)

router.post('/', [Entitlements.unspecified], userController.create)

router.put('/', [Entitlements.unspecified], userController.update)

export default router
