import marketplacesController from '../../controllers/marketplaces'
import { entitled } from '../../services/entitled-router'
import { Entitlements } from '../../enterprise/rbac/Entitlements'

const router = entitled.Router()

// READ
router.get('/templates', [Entitlements.templates.marketplace], marketplacesController.getAllTemplates)

router.post('/custom', [Entitlements.templates.flowexport, Entitlements.templates.toolexport], marketplacesController.saveCustomTemplate)

// READ
router.get('/custom', [Entitlements.templates.custom], marketplacesController.getAllCustomTemplates)

// DELETE
router.delete(['/', '/custom/:id'], [Entitlements.templates.customDelete], marketplacesController.deleteCustomTemplate)

export default router.getRouter()
