import internalPredictionsController from '../../controllers/internal-predictions'
import { entitled } from '../../services/entitled-router'
import { Entitlements } from '../../enterprise/rbac/Entitlements'
const router = entitled.Router()

// CREATE
router.post(['/', '/:id'], [Entitlements.unspecified], internalPredictionsController.createInternalPrediction)

export default router
