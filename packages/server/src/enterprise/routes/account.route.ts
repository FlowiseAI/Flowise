
import { AccountController } from '../controllers/account.controller';
import { IdentityManager } from '../../IdentityManager';
import { EntitledRouter } from '../../routes/entitled-router';

const router = entitled.Router();
const accountController = new AccountController();

router.post('/register', ['public'], accountController.register);

// feature flag to workspace since only user who has workspaces can invite
router.post(
  '/invite',
  ['workspace:add-user', 'users:manage'],
  IdentityManager.checkFeatureByPlan('feat:workspaces'),
  accountController.invite
);

router.post('/login', ['public'], accountController.login);

router.post('/logout', ['public'], accountController.logout);

router.post('/verify', ['public'], accountController.verify);

router.post('/resend-verification', ['public'], accountController.resendVerificationEmail);

router.post('/forgot-password', ['public'], accountController.forgotPassword);

router.post('/reset-password', ['public'], accountController.resetPassword);

router.post('/cancel-subscription', ['public'], accountController.cancelPreviousCloudSubscrption);

router.post('/billing', ['public'], accountController.createStripeCustomerPortalSession);

router.get('/basic-auth', ['public'], accountController.getBasicAuth);

router.post('/basic-auth', ['public'], accountController.checkBasicAuth);

export default router.getRouter();
