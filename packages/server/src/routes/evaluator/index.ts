import evaluatorsController from '../../controllers/evaluators'
import { entitled } from '../../services/entitled-router'
import { Entitlements } from '../../enterprise/rbac/Entitlements'
import { AuthenticationStrategy } from '../../enterprise/auth/AuthenticationStrategy'

const router = entitled.Router()

// get all datasets
router.get(
    '/',
    [Entitlements.evaluators.view],
    [AuthenticationStrategy.JWT, AuthenticationStrategy.API_KEY],
    evaluatorsController.getAllEvaluators
)
// get new dataset
router.get(
    ['/', '/:id'],
    [Entitlements.evaluators.view],
    [AuthenticationStrategy.JWT, AuthenticationStrategy.API_KEY],
    evaluatorsController.getEvaluator
)
// Create new dataset
router.post(
    ['/', '/:id'],
    [Entitlements.evaluators.create],
    [AuthenticationStrategy.JWT, AuthenticationStrategy.API_KEY],
    evaluatorsController.createEvaluator
)
// Update dataset
router.put(
    ['/', '/:id'],
    [Entitlements.evaluators.update],
    [AuthenticationStrategy.JWT, AuthenticationStrategy.API_KEY],
    evaluatorsController.updateEvaluator
)
// Delete dataset via id
router.delete(
    ['/', '/:id'],
    [Entitlements.evaluators.delete],
    [AuthenticationStrategy.JWT, AuthenticationStrategy.API_KEY],
    evaluatorsController.deleteEvaluator
)

export default router
