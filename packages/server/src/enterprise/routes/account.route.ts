import { AccountController } from '../controllers/account.controller'
import { IdentityManager } from '../../IdentityManager'
import { entitled } from '../../services/entitled-router'
import { Entitlements } from '../rbac/Entitlements'

const router = entitled.Router()
const accountController = new AccountController()

router.post('/register', [Entitlements.unspecified], accountController.register)

// feature flag to workspace since only user who has workspaces can invite
router.post(
    '/invite',
    [Entitlements.workspace.addUser, Entitlements.users.manage],
    IdentityManager.checkFeatureByPlan('feat:workspaces'),
    accountController.invite
)

router.post('/login', [Entitlements.unspecified], accountController.login)

router.post('/logout', [Entitlements.unspecified], accountController.logout)

router.post('/verify', [Entitlements.unspecified], accountController.verify)

router.post('/resend-verification', [Entitlements.unspecified], accountController.resendVerificationEmail)

router.post('/forgot-password', [Entitlements.unspecified], accountController.forgotPassword)

router.post('/reset-password', [Entitlements.unspecified], accountController.resetPassword)

router.post('/cancel-subscription', [Entitlements.unspecified], accountController.cancelPreviousCloudSubscrption)

router.post('/billing', [Entitlements.unspecified], accountController.createStripeCustomerPortalSession)

router.get('/basic-auth', [Entitlements.unspecified], accountController.getBasicAuth)

router.post('/basic-auth', [Entitlements.unspecified], accountController.checkBasicAuth)

export default router
