import evaluationsController from '../../controllers/evaluations'
import { entitled } from '../../services/entitled-router'
import { Entitlements } from '../../enterprise/rbac/Entitlements'

const router = entitled.Router()

router.get('/', [Entitlements.evaluations.view], evaluationsController.getAllEvaluations)
router.get('/:id', [Entitlements.evaluations.view], evaluationsController.getEvaluation)
router.delete('/:id', [Entitlements.evaluations.delete], evaluationsController.deleteEvaluation)
router.post('/', [Entitlements.evaluations.create], evaluationsController.createEvaluation)
router.get('/is-outdated/:id', [Entitlements.unspecified], evaluationsController.isOutdated)
router.post('/run-again/:id', [Entitlements.evaluations.run], evaluationsController.runAgain)
router.get('/versions/:id', [Entitlements.evaluations.view], evaluationsController.getVersions)
router.patch('/', [Entitlements.evaluations.delete], evaluationsController.patchDeleteEvaluations)

export default router.getRouter()
