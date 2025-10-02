import evaluationsController from '../../controllers/evaluations'
import { entitled } from '../../services/entitled-router'

const router = entitled.Router()

router.get('/', ['evaluations:view'], evaluationsController.getAllEvaluations)
router.get('/:id', ['evaluations:view'], evaluationsController.getEvaluation)
router.delete('/:id', ['evaluations:delete'], evaluationsController.deleteEvaluation)
router.post('/', ['evaluations:create'], evaluationsController.createEvaluation)
router.get('/is-outdated/:id', ['public'], evaluationsController.isOutdated)
router.post('/run-again/:id', ['evaluations:run'], evaluationsController.runAgain)
router.get('/versions/:id', ['evaluations:view'], evaluationsController.getVersions)
router.patch('/', ['evaluations:delete'], evaluationsController.patchDeleteEvaluations)

export default router.getRouter()
