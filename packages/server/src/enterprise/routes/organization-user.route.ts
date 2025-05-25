import express from 'express'
import { OrganizationUserController } from '../controllers/organization-user.controller'
import { checkPermission } from '../rbac/PermissionCheck'
import { IdentityManager } from '../../IdentityManager'

const router = express.Router()
const organizationUserController = new OrganizationUserController()

router.get('/', organizationUserController.read)

router.post('/', IdentityManager.checkFeatureByPlan('feat:users'), checkPermission('users:manage'), organizationUserController.create)

router.put('/', IdentityManager.checkFeatureByPlan('feat:users'), checkPermission('users:manage'), organizationUserController.update)

router.delete('/', IdentityManager.checkFeatureByPlan('feat:users'), checkPermission('users:manage'), organizationUserController.delete)

export default router
