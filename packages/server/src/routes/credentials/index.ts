import express from 'express'
import credentialsController from '../../controllers/credentials'
import { checkPermission, checkAnyPermission } from '../../enterprise/rbac/PermissionCheck'
const router = express.Router()

// CREATE
router.post('/', checkPermission('credentials:create'), credentialsController.createCredential)

// READ
router.get('/', checkPermission('credentials:view'), credentialsController.getAllCredentials)
router.get(['/', '/:id'], checkPermission('credentials:view'), credentialsController.getCredentialById)

// UPDATE
router.put(['/', '/:id'], checkAnyPermission('credentials:create,credentials:update'), credentialsController.updateCredential)

// DELETE
router.delete(['/', '/:id'], checkPermission('credentials:delete'), credentialsController.deleteCredentials)

export default router
