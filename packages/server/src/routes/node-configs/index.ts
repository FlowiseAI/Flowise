import nodeConfigsController from '../../controllers/node-configs'
import { entitled } from '../../services/entitled-router'
import { Entitlements } from '../../enterprise/rbac/Entitlements'
import { AuthenticationStrategy } from '../../enterprise/auth/AuthenticationStrategy'

const router = entitled.Router()

// CREATE
router.post('/', [Entitlements.unspecified], [AuthenticationStrategy.PUBLIC], nodeConfigsController.getAllNodeConfigs)

export default router
