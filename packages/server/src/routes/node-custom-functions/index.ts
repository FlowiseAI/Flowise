import nodesRouter from '../../controllers/nodes'
import { entitled } from '../../services/entitled-router'
import { Entitlements } from '../../enterprise/rbac/Entitlements'
const router = entitled.Router()

// CREATE

// READ
router.post('/', [Entitlements.unspecified], nodesRouter.executeCustomFunction)

// UPDATE

// DELETE

export default router
