import express from 'express'
import marketplacesController from '../../controllers/marketplaces'
import { checkPermission, checkAnyPermission } from '../../enterprise/rbac/PermissionCheck'
const router = express.Router()

// READ
router.get('/templates', checkPermission('templates:marketplace'), marketplacesController.getAllTemplates)

router.post('/custom', checkAnyPermission('templates:flowexport,templates:toolexport'), marketplacesController.saveCustomTemplate)

// READ
router.get('/custom', checkPermission('templates:custom'), marketplacesController.getAllCustomTemplates)

// DELETE
router.delete(['/', '/custom/:id'], checkPermission('templates:custom-delete'), marketplacesController.deleteCustomTemplate)

export default router
