import express from 'express'
import authController from '../../controllers/auth'
const router = express.Router()

// RBAC
router.get(['/', '/permissions'], authController.getAllPermissions)

export default router
