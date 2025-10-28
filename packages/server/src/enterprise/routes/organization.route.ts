import { OrganizationController } from '../controllers/organization.controller'
import { entitled } from '../../services/entitled-router'
import { Entitlements } from '../rbac/Entitlements'
import { AuthenticationStrategy } from '../auth/AuthenticationStrategy'

const router = entitled.Router()
const organizationController = new OrganizationController()

router.get('/', [Entitlements.unspecified], [AuthenticationStrategy.PUBLIC], organizationController.read)

router.post('/', [Entitlements.unspecified], [AuthenticationStrategy.PUBLIC], organizationController.create)

router.put('/', [Entitlements.unspecified], [AuthenticationStrategy.PUBLIC], organizationController.update)

router.get(
    '/additional-seats-quantity',
    [Entitlements.unspecified],
    [AuthenticationStrategy.PUBLIC],
    organizationController.getAdditionalSeatsQuantity
)

router.get(
    '/customer-default-source',
    [Entitlements.unspecified],
    [AuthenticationStrategy.PUBLIC],
    organizationController.getCustomerWithDefaultSource
)

router.get(
    '/additional-seats-proration',
    [Entitlements.unspecified],
    [AuthenticationStrategy.PUBLIC],
    organizationController.getAdditionalSeatsProration
)

router.post(
    '/update-additional-seats',
    [Entitlements.unspecified],
    [AuthenticationStrategy.PUBLIC],
    organizationController.updateAdditionalSeats
)

router.get('/plan-proration', [Entitlements.unspecified], [AuthenticationStrategy.PUBLIC], organizationController.getPlanProration)

router.post(
    '/update-subscription-plan',
    [Entitlements.unspecified],
    [AuthenticationStrategy.PUBLIC],
    organizationController.updateSubscriptionPlan
)

router.get('/get-current-usage', [Entitlements.unspecified], [AuthenticationStrategy.PUBLIC], organizationController.getCurrentUsage)

export default router
