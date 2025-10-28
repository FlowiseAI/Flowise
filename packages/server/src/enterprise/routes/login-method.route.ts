import { LoginMethodController } from '../controllers/login-method.controller'
import { entitled } from '../../services/entitled-router'
import { Entitlements } from '../rbac/Entitlements'
import { AuthenticationStrategy } from '../auth/AuthenticationStrategy'

const router = entitled.Router()
const loginMethodController = new LoginMethodController()

router.get('/', [Entitlements.unspecified], [AuthenticationStrategy.PUBLIC], loginMethodController.read)

router.get('/default', [Entitlements.unspecified], [AuthenticationStrategy.PUBLIC], loginMethodController.defaultMethods)

router.post('/', [Entitlements.sso.manage], [AuthenticationStrategy.JWT, AuthenticationStrategy.API_KEY], loginMethodController.create)

router.put('/', [Entitlements.sso.manage], [AuthenticationStrategy.JWT, AuthenticationStrategy.API_KEY], loginMethodController.update)

router.post(
    '/test',
    [Entitlements.sso.manage],
    [AuthenticationStrategy.JWT, AuthenticationStrategy.API_KEY],
    loginMethodController.testConfig
)

export default router
