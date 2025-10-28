import evaluationsController from '../../controllers/evaluations'
import { entitled } from '../../services/entitled-router'
import { Entitlements } from '../../enterprise/rbac/Entitlements'
import { AuthenticationStrategy } from '../../enterprise/auth/AuthenticationStrategy'

const router = entitled.Router()

router.get(
    '/',
    [Entitlements.evaluations.view],
    [AuthenticationStrategy.JWT, AuthenticationStrategy.API_KEY],
    evaluationsController.getAllEvaluations
)
router.get(
    '/:id',
    [Entitlements.evaluations.view],
    [AuthenticationStrategy.JWT, AuthenticationStrategy.API_KEY],
    evaluationsController.getEvaluation
)
router.delete(
    '/:id',
    [Entitlements.evaluations.delete],
    [AuthenticationStrategy.JWT, AuthenticationStrategy.API_KEY],
    evaluationsController.deleteEvaluation
)
router.post(
    '/',
    [Entitlements.evaluations.create],
    [AuthenticationStrategy.JWT, AuthenticationStrategy.API_KEY],
    evaluationsController.createEvaluation
)
router.get('/is-outdated/:id', [Entitlements.unspecified], [AuthenticationStrategy.PUBLIC], evaluationsController.isOutdated)
router.post(
    '/run-again/:id',
    [Entitlements.evaluations.run],
    [AuthenticationStrategy.JWT, AuthenticationStrategy.API_KEY],
    evaluationsController.runAgain
)
router.get(
    '/versions/:id',
    [Entitlements.evaluations.view],
    [AuthenticationStrategy.JWT, AuthenticationStrategy.API_KEY],
    evaluationsController.getVersions
)
router.patch(
    '/',
    [Entitlements.evaluations.delete],
    [AuthenticationStrategy.JWT, AuthenticationStrategy.API_KEY],
    evaluationsController.patchDeleteEvaluations
)

export default router.getRouter()
