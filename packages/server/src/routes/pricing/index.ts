import pricingController from '../../controllers/pricing'
import { entitled } from '../../services/entitled-router'
import { Entitlements } from '../../enterprise/rbac/Entitlements'
import { AuthenticationStrategy } from '../../enterprise/auth/AuthenticationStrategy'

const router = entitled.Router()

// GET
router.get('/', [Entitlements.unspecified], [AuthenticationStrategy.PUBLIC], pricingController.getPricing)

export default router.getRouter()
