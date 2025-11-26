import express from 'express'
import { AccountController } from '../controllers/account.controller'
import { IdentityManager } from '../../IdentityManager'
import { checkAnyPermission } from '../rbac/PermissionCheck'

const router = express.Router()
const accountController = new AccountController()

router.post('/register', accountController.register)

// feature flag to workspace since only user who has workspaces can invite
router.post(
    '/invite',
    IdentityManager.checkFeatureByPlan('feat:workspaces'),
    checkAnyPermission('workspace:add-user,users:manage'),
    accountController.invite
)

router.post('/login', accountController.login)

router.post('/logout', accountController.logout)

router.post('/verify', accountController.verify)

router.post('/resend-verification', accountController.resendVerificationEmail)

router.post('/forgot-password', accountController.forgotPassword)

router.post('/reset-password', accountController.resetPassword)

router.post('/billing', accountController.createStripeCustomerPortalSession)

router.get('/basic-auth', accountController.getBasicAuth)

router.post('/basic-auth', accountController.checkBasicAuth)

export default router
