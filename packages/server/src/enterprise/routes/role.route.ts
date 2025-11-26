import express from 'express'
import { RoleController } from '../controllers/role.controller'
import { checkPermission } from '../rbac/PermissionCheck'

const router = express.Router()
const roleController = new RoleController()

router.get('/', roleController.read)

router.post('/', checkPermission('roles:manage'), roleController.create)

router.put('/', checkPermission('roles:manage'), roleController.update)

router.delete('/', checkPermission('roles:manage'), roleController.delete)

export default router
