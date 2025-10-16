import nodesRouter from '../../controllers/nodes'
import { entitled } from '../../services/entitled-router'
import { Entitlements } from '../../enterprise/rbac/Entitlements'

const router = entitled.Router()

router.post(['/', '/:name'], [Entitlements.unspecified], nodesRouter.getSingleNodeAsyncOptions)

export default router.getRouter()
