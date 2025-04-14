import express from 'express'
import billingController from '../../controllers/billing'
import enforceAbility from '../../middlewares/authentication/enforceAbility'

const router = express.Router()

// Customer Management
router.get('/customer/status', billingController.getCustomerStatus)

// Usage Tracking
// TODO: Remove this route
// router.post('/usage/track', billingController.trackUsage)
router.get('/usage/summary', enforceAbility('Billing'), billingController.getUsageSummary)
router.get('/usage/events', enforceAbility('Billing'), billingController.getUsageEvents)

// Subscription Management
router.get('/subscription/status', enforceAbility('Billing'), billingController.getSubscriptionWithUsage)
router.post('/subscriptions', enforceAbility('Billing'), billingController.createCheckoutSession)
router.put('/subscriptions/:id', enforceAbility('Billing'), billingController.updateSubscription)
router.delete('/subscriptions/:id', enforceAbility('Billing'), billingController.cancelSubscription)

// Payment Methods
router.post('/payment-methods', enforceAbility('Billing'), billingController.attachPaymentMethod)

// Billing Portal
router.post('/portal-sessions', enforceAbility('Billing'), billingController.createBillingPortalSession)

// Invoices
router.get('/invoice/upcoming', enforceAbility('Billing'), billingController.getUpcomingInvoice)
router.post('/invoices/upcoming', enforceAbility('Billing'), billingController.getUpcomingInvoice)

// Usage Sync (Internal)
router.get('/usage/sync', billingController.usageSyncHandler)
router.post('/usage/sync', billingController.usageSyncHandler)

// Webhooks
router.post('/webhooks', billingController.handleWebhook)

export default router
