import express from 'express'
import evaluatorsController from '../../controllers/evaluators'
import { checkPermission, checkAnyPermission } from '../../enterprise/rbac/PermissionCheck'
const router = express.Router()

// get all datasets
router.get('/', checkPermission('evaluators:view'), evaluatorsController.getAllEvaluators)
// get new dataset
router.get(['/', '/:id'], checkPermission('evaluators:view'), evaluatorsController.getEvaluator)
// Create new dataset
router.post(['/', '/:id'], checkPermission('evaluators:create'), evaluatorsController.createEvaluator)
// Update dataset
router.put(['/', '/:id'], checkAnyPermission('evaluators:create,evaluators:update'), evaluatorsController.updateEvaluator)
// Delete dataset via id
router.delete(['/', '/:id'], checkPermission('evaluators:delete'), evaluatorsController.deleteEvaluator)

export default router
