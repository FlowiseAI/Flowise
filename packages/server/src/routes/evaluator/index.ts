import evaluatorsController from '../../controllers/evaluators'
import { entitled } from '../../services/entitled-router'

const router = entitled.Router()

// get all datasets
router.get('/', ['evaluators:view'], evaluatorsController.getAllEvaluators)
// get new dataset
router.get(['/', '/:id'], ['evaluators:view'], evaluatorsController.getEvaluator)
// Create new dataset
router.post(['/', '/:id'], ['evaluators:create'], evaluatorsController.createEvaluator)
// Update dataset
router.put(['/', '/:id'], ['evaluators:update'], evaluatorsController.updateEvaluator)
// Delete dataset via id
router.delete(['/', '/:id'], ['evaluators:delete'], evaluatorsController.deleteEvaluator)

export default router.getRouter()
