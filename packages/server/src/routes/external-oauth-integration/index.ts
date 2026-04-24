import express from 'express'
import externalOAuthIntegrationController from '../../controllers/external-oauth-integration'
import { checkPermission } from '../../enterprise/rbac/PermissionCheck'

const router = express.Router()

router.get('/', checkPermission('externalOAuth:manage'), externalOAuthIntegrationController.list)
router.get('/:id', checkPermission('externalOAuth:manage'), externalOAuthIntegrationController.getOne)
router.post('/', checkPermission('externalOAuth:manage'), externalOAuthIntegrationController.create)
router.put('/:id', checkPermission('externalOAuth:manage'), externalOAuthIntegrationController.update)
router.delete('/:id', checkPermission('externalOAuth:manage'), externalOAuthIntegrationController.remove)

export default router
