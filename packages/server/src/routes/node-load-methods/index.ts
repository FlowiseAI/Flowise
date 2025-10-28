import nodesRouter from '../../controllers/nodes'
import { entitled } from '../../services/entitled-router'
import { Entitlements } from '../../enterprise/rbac/Entitlements'
import { AuthenticationStrategy } from '../../enterprise/auth/AuthenticationStrategy'

const router = entitled.Router()

router.post(['/', '/:name'], [Entitlements.unspecified], [AuthenticationStrategy.PUBLIC], nodesRouter.getSingleNodeAsyncOptions)

export default router.getRouter()
