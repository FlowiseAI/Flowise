import { UserController } from '../controllers/user.controller'
import { entitled } from '../../services/entitled-router'
import { Entitlements } from '../rbac/Entitlements'
import { AuthenticationStrategy } from '../auth/AuthenticationStrategy'

const router = entitled.Router()
const userController = new UserController()

router.get('/', [Entitlements.unspecified], [AuthenticationStrategy.PUBLIC], userController.read)
router.get('/test', [Entitlements.unspecified], [AuthenticationStrategy.PUBLIC], userController.test)

router.post('/', [Entitlements.unspecified], [AuthenticationStrategy.PUBLIC], userController.create)

router.put('/', [Entitlements.unspecified], [AuthenticationStrategy.PUBLIC], userController.update)

export default router.getRouter()
