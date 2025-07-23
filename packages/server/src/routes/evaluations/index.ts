import express from 'express'
import evaluationsController from '../../controllers/evaluations'
import { checkPermission, checkAnyPermission } from '../../enterprise/rbac/PermissionCheck'
const router = express.Router()

router.get('/', checkPermission('evaluations:view'), evaluationsController.getAllEvaluations)
router.get('/:id', checkPermission('evaluations:view'), evaluationsController.getEvaluation)
router.delete('/:id', checkPermission('evaluations:delete'), evaluationsController.deleteEvaluation)
router.post('/', checkPermission('evaluations:create'), evaluationsController.createEvaluation)
router.get('/is-outdated/:id', evaluationsController.isOutdated)
router.post('/run-again/:id', checkAnyPermission('evaluations:create,evaluations:run'), evaluationsController.runAgain)
router.get('/versions/:id', checkPermission('evaluations:view'), evaluationsController.getVersions)
router.patch('/', checkPermission('evaluations:delete'), evaluationsController.patchDeleteEvaluations)
export default router
