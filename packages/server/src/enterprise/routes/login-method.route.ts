import { LoginMethodController } from '../controllers/login-method.controller'
import { entitled } from '../../services/entitled-router'
import { Entitlements } from '../rbac/Entitlements'

const router = entitled.Router()
const loginMethodController = new LoginMethodController()

router.get('/', [Entitlements.unspecified], loginMethodController.read)

router.get('/default', [Entitlements.unspecified], loginMethodController.defaultMethods)

router.post('/', [Entitlements.sso.manage], loginMethodController.create)

router.put('/', [Entitlements.sso.manage], loginMethodController.update)

router.post('/test', [Entitlements.sso.manage], loginMethodController.testConfig)

export default router.getRouter()
