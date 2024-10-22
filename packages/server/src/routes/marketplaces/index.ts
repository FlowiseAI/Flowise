import express from 'express'
import marketplacesController from '../../controllers/marketplaces'
const router = express.Router()

// READ
router.get('/templates', marketplacesController.getAllTemplates)
router.get('/templates/:id', marketplacesController.getMarketplaceTemplate)

export default router
