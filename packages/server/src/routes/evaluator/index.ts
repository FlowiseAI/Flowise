import evaluatorsController from '../../controllers/evaluators'
import { entitled } from '../../services/entitled-router'
import { Entitlements } from '../../enterprise/rbac/Entitlements'

const router = entitled.Router()

// get all datasets
router.get('/', [Entitlements.evaluators.view], evaluatorsController.getAllEvaluators)
// get new dataset
router.get(['/', '/:id'], [Entitlements.evaluators.view], evaluatorsController.getEvaluator)
// Create new dataset
router.post(['/', '/:id'], [Entitlements.evaluators.create], evaluatorsController.createEvaluator)
// Update dataset
router.put(['/', '/:id'], [Entitlements.evaluators.update], evaluatorsController.updateEvaluator)
// Delete dataset via id
router.delete(['/', '/:id'], [Entitlements.evaluators.delete], evaluatorsController.deleteEvaluator)

export default router
