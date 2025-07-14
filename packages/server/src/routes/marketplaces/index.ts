import express from 'express'
import marketplacesController from '../../controllers/marketplaces'
import enforceAbility from '../../middlewares/authentication/enforceAbility'
const router = express.Router()

// READ
router.get('/templates', marketplacesController.getAllTemplates)
router.get('/templates/:id', marketplacesController.getMarketplaceTemplate)

router.post('/custom', enforceAbility('CustomTemplate'), marketplacesController.saveCustomTemplate)

// READ
router.get('/custom', marketplacesController.getAllCustomTemplates)

// DELETE
router.delete(['/', '/custom/:id'], marketplacesController.deleteCustomTemplate)

export default router
