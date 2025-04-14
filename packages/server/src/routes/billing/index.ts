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
router.get('/subscription/status', billingController.getSubscriptionWithUsage)
router.post('/subscriptions', billingController.createCheckoutSession)
router.put('/subscriptions/:id', billingController.updateSubscription)
router.delete('/subscriptions/:id', billingController.cancelSubscription)

// Payment Methods
router.post('/payment-methods', billingController.attachPaymentMethod)

// Billing Portal
router.post('/portal-sessions', billingController.createBillingPortalSession)

// Invoices
router.get('/invoice/upcoming', billingController.getUpcomingInvoice)
router.post('/invoices/upcoming', billingController.getUpcomingInvoice)

// Usage Sync (Internal)
router.get('/usage/sync', billingController.usageSyncHandler)
router.post('/usage/sync', billingController.usageSyncHandler)

// Webhooks
router.post('/webhooks', billingController.handleWebhook)

export default router
