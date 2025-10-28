import marketplacesController from '../../controllers/marketplaces'
import { entitled } from '../../services/entitled-router'
import { Entitlements } from '../../enterprise/rbac/Entitlements'
import { AuthenticationStrategy } from '../../enterprise/auth/AuthenticationStrategy'

const router = entitled.Router()

// READ
router.get(
    '/templates',
    [Entitlements.templates.marketplace],
    [AuthenticationStrategy.JWT, AuthenticationStrategy.API_KEY],
    marketplacesController.getAllTemplates
)

router.post(
    '/custom',
    [Entitlements.templates.flowexport, Entitlements.templates.toolexport],
    [AuthenticationStrategy.JWT, AuthenticationStrategy.API_KEY],
    marketplacesController.saveCustomTemplate
)

// READ
router.get(
    '/custom',
    [Entitlements.templates.custom],
    [AuthenticationStrategy.JWT, AuthenticationStrategy.API_KEY],
    marketplacesController.getAllCustomTemplates
)

// DELETE
router.delete(
    ['/', '/custom/:id'],
    [Entitlements.templates.customDelete],
    [AuthenticationStrategy.JWT, AuthenticationStrategy.API_KEY],
    marketplacesController.deleteCustomTemplate
)

export default router
