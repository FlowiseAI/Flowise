import express from 'express'
import apikeyController from '../../controllers/apikey'
import { checkAnyPermission, checkPermission } from '../../enterprise/rbac/PermissionCheck'
const router = express.Router()

// CREATE
router.post('/', checkPermission('apikeys:create'), apikeyController.createApiKey)
router.post('/import', checkPermission('apikeys:import'), apikeyController.importKeys)

// READ
router.get('/', checkPermission('apikeys:view'), apikeyController.getAllApiKeys)

// UPDATE
router.put(['/', '/:id'], checkAnyPermission('apikeys:create,apikeys:update'), apikeyController.updateApiKey)

// DELETE
router.delete(['/', '/:id'], checkPermission('apikeys:delete'), apikeyController.deleteApiKey)

export default router
