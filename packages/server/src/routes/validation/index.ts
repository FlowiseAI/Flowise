import validationController from '../../controllers/validation'
import { entitled } from '../../services/entitled-router'
import { Entitlements } from '../../enterprise/rbac/Entitlements'
const router = entitled.Router()

// READ
router.get('/:id', [Entitlements.unspecified], validationController.checkFlowValidation)

export default router
