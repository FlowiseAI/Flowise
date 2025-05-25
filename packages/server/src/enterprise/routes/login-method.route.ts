import express from 'express'
import { LoginMethodController } from '../controllers/login-method.controller'
import { checkPermission } from '../rbac/PermissionCheck'

const router = express.Router()
const loginMethodController = new LoginMethodController()

router.get('/', loginMethodController.read)

router.get('/default', loginMethodController.defaultMethods)

router.post('/', checkPermission('sso:manage'), loginMethodController.create)

router.put('/', checkPermission('sso:manage'), loginMethodController.update)

router.post('/test', checkPermission('sso:manage'), loginMethodController.testConfig)

export default router
