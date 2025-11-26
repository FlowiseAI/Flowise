import express from 'express'
import auditController from '../../controllers/audit'
import { checkPermission } from '../../rbac/PermissionCheck'
const router = express.Router()

router.post(['/', '/login-activity'], checkPermission('loginActivity:view'), auditController.fetchLoginActivity)
router.post(['/', '/login-activity/delete'], checkPermission('loginActivity:delete'), auditController.deleteLoginActivity)

export default router
