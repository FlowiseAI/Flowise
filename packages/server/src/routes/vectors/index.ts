import vectorsController from '../../controllers/vectors'
import { getMulterStorage } from '../../utils'
import { entitled } from '../../services/entitled-router'
import { Entitlements } from '../../enterprise/rbac/Entitlements'

const router = entitled.Router()

// CREATE
router.post(
    ['/upsert/', '/upsert/:id'],
    [Entitlements.unspecified],
    getMulterStorage().array('files'),
    vectorsController.getRateLimiterMiddleware,
    vectorsController.upsertVectorMiddleware
)
router.post(
    ['/internal-upsert/', '/internal-upsert/:id'],
    [Entitlements.unspecified],
    getMulterStorage().array('files'),
    vectorsController.createInternalUpsert
)

export default router
