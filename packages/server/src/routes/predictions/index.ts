import predictionsController from '../../controllers/predictions'
import { getMulterStorage } from '../../utils'
import { entitled } from '../../services/entitled-router'
import { Entitlements } from '../../enterprise/rbac/Entitlements'

const router = entitled.Router()

// CREATE
router.post(
    ['/', '/:id'],
    [Entitlements.unspecified],
    getMulterStorage().array('files'),
    predictionsController.getRateLimiterMiddleware,
    predictionsController.createPrediction
)

export default router
