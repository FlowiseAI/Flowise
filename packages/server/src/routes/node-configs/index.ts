import nodeConfigsController from '../../controllers/node-configs'
import { entitled } from '../../services/entitled-router'
import { Entitlements } from '../../enterprise/rbac/Entitlements'

const router = entitled.Router()

// CREATE
router.post('/', [Entitlements.unspecified], nodeConfigsController.getAllNodeConfigs)

export default router.getRouter()
