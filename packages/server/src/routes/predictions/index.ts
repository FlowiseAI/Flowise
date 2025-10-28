import predictionsController from '../../controllers/predictions'
import { getMulterStorage } from '../../utils'
import { entitled } from '../../services/entitled-router'
import { Entitlements } from '../../enterprise/rbac/Entitlements'
import { AuthenticationStrategy } from '../../enterprise/auth/AuthenticationStrategy'

const router = entitled.Router()

// CREATE
router.post(
    ['/', '/:id'],
    [Entitlements.unspecified],
    [AuthenticationStrategy.PUBLIC],
    getMulterStorage().array('files'),
    predictionsController.getRateLimiterMiddleware,
    predictionsController.createPrediction
)

export default router
