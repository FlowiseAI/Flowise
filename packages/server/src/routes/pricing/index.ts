import pricingController from '../../controllers/pricing'
import { entitled } from '../../services/entitled-router'
import { Entitlements } from '../../enterprise/rbac/Entitlements'
const router = entitled.Router()

// GET
router.get('/', [Entitlements.unspecified], pricingController.getPricing)

export default router
