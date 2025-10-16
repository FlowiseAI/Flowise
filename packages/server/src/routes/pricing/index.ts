import express from 'express'
import pricingController from '../../controllers/pricing'
const router = entitled.Router()

// GET
router.get('/', pricingController.getPricing)

export default router
