import express from 'express'
import authController from '../../controllers/auth'
const router = express.Router()

// RBAC
router.get(['/sso-success'], authController.ssoSuccess)

router.get(['/:type', '/permissions/:type'], authController.getAllPermissions)

export default router
