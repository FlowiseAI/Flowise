import express from 'express'
import pricingController from '../../controllers/pricing'
const router = express.Router()

// GET
router.get('/', pricingController.getPricing)

export default router
