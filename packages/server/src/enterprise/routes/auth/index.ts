import express from 'express'
import authController from '../../controllers/auth'
const router = entitled.Router()

// RBAC
router.get(['/', '/permissions'], authController.getAllPermissions)

router.get(['/sso-success'], authController.ssoSuccess)

export default router
