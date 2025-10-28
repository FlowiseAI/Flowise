import internalPredictionsController from '../../controllers/internal-predictions'
import { entitled } from '../../services/entitled-router'
import { Entitlements } from '../../enterprise/rbac/Entitlements'
import { AuthenticationStrategy } from '../../enterprise/auth/AuthenticationStrategy'

const router = entitled.Router()

// CREATE
router.post(
    ['/', '/:id'],
    [Entitlements.unspecified],
    [AuthenticationStrategy.PUBLIC],
    internalPredictionsController.createInternalPrediction
)

export default router
