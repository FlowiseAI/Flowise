import { AccountController } from '../controllers/account.controller'
import { IdentityManager } from '../../IdentityManager'
import { entitled } from '../../services/entitled-router'
import { Entitlements } from '../rbac/Entitlements'
import { AuthenticationStrategy } from '../auth/AuthenticationStrategy'

const router = entitled.Router()
const accountController = new AccountController()

router.post('/register', [Entitlements.unspecified], [AuthenticationStrategy.PUBLIC], accountController.register)

// feature flag to workspace since only user who has workspaces can invite
router.post(
    '/invite',
    [Entitlements.workspace.addUser, Entitlements.users.manage],
    [AuthenticationStrategy.JWT, AuthenticationStrategy.API_KEY],
    IdentityManager.checkFeatureByPlan('feat:workspaces'),
    accountController.invite
)

router.post('/login', [Entitlements.unspecified], [AuthenticationStrategy.PUBLIC], accountController.login)

router.post('/logout', [Entitlements.unspecified], [AuthenticationStrategy.PUBLIC], accountController.logout)

router.post('/verify', [Entitlements.unspecified], [AuthenticationStrategy.PUBLIC], accountController.verify)

router.post('/resend-verification', [Entitlements.unspecified], [AuthenticationStrategy.PUBLIC], accountController.resendVerificationEmail)

router.post('/forgot-password', [Entitlements.unspecified], [AuthenticationStrategy.PUBLIC], accountController.forgotPassword)

router.post('/reset-password', [Entitlements.unspecified], [AuthenticationStrategy.PUBLIC], accountController.resetPassword)

router.post(
    '/cancel-subscription',
    [Entitlements.unspecified],
    [AuthenticationStrategy.PUBLIC],
    accountController.cancelPreviousCloudSubscrption
)

router.post('/billing', [Entitlements.unspecified], [AuthenticationStrategy.PUBLIC], accountController.createStripeCustomerPortalSession)

router.get('/basic-auth', [Entitlements.unspecified], [AuthenticationStrategy.PUBLIC], accountController.getBasicAuth)

router.post('/basic-auth', [Entitlements.unspecified], [AuthenticationStrategy.PUBLIC], accountController.checkBasicAuth)

export default router.getRouter()
