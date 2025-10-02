import { LoginMethodController } from '../controllers/login-method.controller'
import { EntitledRouter } from '../../routes/entitled-router'

const router = new EntitledRouter()
const loginMethodController = new LoginMethodController()

router.get('/', ['public'], loginMethodController.read)

router.get('/default', ['public'], loginMethodController.defaultMethods)

router.post('/', ['sso:manage'], loginMethodController.create)

router.put('/', ['sso:manage'], loginMethodController.update)

router.post('/test', ['sso:manage'], loginMethodController.testConfig)

export default router.getRouter()
