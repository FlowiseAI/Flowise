import nodesRouter from '../../controllers/nodes'
import { entitled } from '../../services/entitled-router'
import { Entitlements } from '../../enterprise/rbac/Entitlements'
import { AuthenticationStrategy } from '../../enterprise/auth/AuthenticationStrategy'

const router = entitled.Router()

// CREATE

// READ
router.post('/', [Entitlements.unspecified], [AuthenticationStrategy.PUBLIC], nodesRouter.executeCustomFunction)

// UPDATE

// DELETE

export default router
