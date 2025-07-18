import express from 'express'
import marketplacesController from '../../controllers/marketplaces'
import enforceAbility from '../../middlewares/authentication/enforceAbility'
const router = express.Router()

// READ - Templates del marketplace (public)
router.get('/templates', marketplacesController.getAllTemplates)
router.get('/templates/:id', marketplacesController.getMarketplaceTemplate)

// READ - Custom templates (req authentication)
router.get('/custom', enforceAbility('Marketplace'), marketplacesController.getAllCustomTemplates)

// 🆕 Add - Organization templates
router.get('/organization', enforceAbility('Marketplace'), marketplacesController.getOrganizationTemplates)
// CREATE - Create custom template
router.post('/custom', enforceAbility('Marketplace'), marketplacesController.saveCustomTemplate)

// DELETE - Delete custom template
router.delete('/custom/:id', enforceAbility('Marketplace'), marketplacesController.deleteCustomTemplate)

export default router
