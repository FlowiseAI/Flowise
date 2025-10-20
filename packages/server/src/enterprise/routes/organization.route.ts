import { OrganizationController } from '../controllers/organization.controller'
import { entitled } from '../../services/entitled-router'
import { Entitlements } from '../rbac/Entitlements'

const router = entitled.Router()
const organizationController = new OrganizationController()

router.get('/', [Entitlements.unspecified], organizationController.read)

router.post('/', [Entitlements.unspecified], organizationController.create)

router.put('/', [Entitlements.unspecified], organizationController.update)

router.get('/additional-seats-quantity', [Entitlements.unspecified], organizationController.getAdditionalSeatsQuantity)

router.get('/customer-default-source', [Entitlements.unspecified], organizationController.getCustomerWithDefaultSource)

router.get('/additional-seats-proration', [Entitlements.unspecified], organizationController.getAdditionalSeatsProration)

router.post('/update-additional-seats', [Entitlements.unspecified], organizationController.updateAdditionalSeats)

router.get('/plan-proration', [Entitlements.unspecified], organizationController.getPlanProration)

router.post('/update-subscription-plan', [Entitlements.unspecified], organizationController.updateSubscriptionPlan)

router.get('/get-current-usage', [Entitlements.unspecified], organizationController.getCurrentUsage)

export default router
