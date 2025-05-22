import express from 'express'
import billingController from '../../controllers/billing'
import enforceAbility from '../../middlewares/authentication/enforceAbility'

const router = express.Router()

router.get('/usage/summary', enforceAbility('Billing'), billingController.getUsageSummary)
router.get('/usage/events', enforceAbility('Billing'), billingController.getUsageEvents)
router.get('/usage/sync', billingController.usageSyncHandler)
router.post('/usage/sync', billingController.usageSyncHandler)

router.post('/subscriptions', enforceAbility('Billing'), billingController.createCheckoutSession)

export default router
