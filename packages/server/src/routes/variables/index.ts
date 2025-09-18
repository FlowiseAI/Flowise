import express from 'express'
import variablesController from '../../controllers/variables'
import { checkAnyPermission, checkPermission } from '../../enterprise/rbac/PermissionCheck'

const router = express.Router()

// CREATE
router.post('/', checkPermission('variables:create'), variablesController.createVariable)

// READ
router.get('/', checkPermission('variables:view'), variablesController.getAllVariables)

// UPDATE
router.put(['/', '/:id'], checkAnyPermission('variables:create,variables:update'), variablesController.updateVariable)

// DELETE
router.delete(['/', '/:id'], checkPermission('variables:delete'), variablesController.deleteVariable)

export default router
