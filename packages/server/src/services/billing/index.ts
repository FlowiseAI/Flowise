import { BillingService } from '../../aai-utils/billing'
import type {
    AttachPaymentMethodParams,
    CreateCheckoutSessionParams,
    UpdateSubscriptionParams,
    GetUpcomingInvoiceParams,
    CreateBillingPortalSessionParams
} from '../../aai-utils/billing'
import { InternalFlowiseError } from '../../errors/internalFlowiseError'
import { StatusCodes } from 'http-status-codes'
import logger from '../../utils/logger'
import { getRunningExpressApp } from '../../utils/getRunningExpressApp'
import { StripeEvent } from '../../database/entities/StripeEvent'
import { Subscription } from '../../database/entities/Subscription'
// import { UserCredits } from '../../database/entities/UserCredits'
import Stripe from 'stripe'

// Initialize billing service with Stripe provider
export const billingService = new BillingService()



async function syncUsageToStripe(traceId?: string) {
    try {
        return await billingService.syncUsageToStripe(traceId || '')
    } catch (error) {
        logger.error('Error syncing usage:', error)
        throw new InternalFlowiseError(
            StatusCodes.INTERNAL_SERVER_ERROR,
            `Failed to sync usage: ${error instanceof Error ? error.message : String(error)}`
        )
    }
}


async function attachPaymentMethod(params: AttachPaymentMethodParams) {
    try {
        return await billingService.attachPaymentMethod(params)
    } catch (error) {
        logger.error('Error attaching payment method:', error)
        throw new InternalFlowiseError(
            StatusCodes.INTERNAL_SERVER_ERROR,
            `Failed to attach payment method: ${error instanceof Error ? error.message : String(error)}`
        )
    }
}

async function createCheckoutSession(params: CreateCheckoutSessionParams) {
    try {
        return await billingService.createCheckoutSession(params)
    } catch (error) {
        logger.error('Error creating checkout session:', error)
        throw new InternalFlowiseError(
            StatusCodes.INTERNAL_SERVER_ERROR,
            `Failed to create checkout session: ${error instanceof Error ? error.message : String(error)}`
        )
    }
}

async function updateSubscription(params: UpdateSubscriptionParams) {
    try {
        return await billingService.updateSubscription(params)
    } catch (error) {
        logger.error('Error updating subscription:', error)
        throw new InternalFlowiseError(
            StatusCodes.INTERNAL_SERVER_ERROR,
            `Failed to update subscription: ${error instanceof Error ? error.message : String(error)}`
        )
    }
}

async function cancelSubscription(subscriptionId: string) {
    try {
        return await billingService.cancelSubscription(subscriptionId)
    } catch (error) {
        logger.error('Error canceling subscription:', error)
        throw new InternalFlowiseError(
            StatusCodes.INTERNAL_SERVER_ERROR,
            `Failed to cancel subscription: ${error instanceof Error ? error.message : String(error)}`
        )
    }
}

async function getUpcomingInvoice(params: GetUpcomingInvoiceParams) {
    try {
        return await billingService.getUpcomingInvoice(params)
    } catch (error) {
        logger.error('Error getting upcoming invoice:', error)
        throw new InternalFlowiseError(
            StatusCodes.INTERNAL_SERVER_ERROR,
            `Failed to get upcoming invoice: ${error instanceof Error ? error.message : String(error)}`
        )
    }
}

async function createBillingPortalSession(params: CreateBillingPortalSessionParams) {
    try {
        return await billingService.createBillingPortalSession(params)
    } catch (error) {
        logger.error('Error creating billing portal session:', error)
        throw new InternalFlowiseError(
            StatusCodes.INTERNAL_SERVER_ERROR,
            `Failed to create billing portal session: ${error instanceof Error ? error.message : String(error)}`
        )
    }
}

async function getSubscriptionWithUsage(subscriptionId: string) {
    try {
        return await billingService.getSubscriptionWithUsage(subscriptionId)
    } catch (error) {
        logger.error('Error getting subscription with usage:', error)
        throw new InternalFlowiseError(
            StatusCodes.INTERNAL_SERVER_ERROR,
            `Failed to get subscription with usage: ${error instanceof Error ? error.message : String(error)}`
        )
    }
}

async function handleWebhook(payload: any, signature: string) {
    try {
        const event = billingService.stripeClient.webhooks.constructEvent(payload, signature, process.env.BILLING_STRIPE_WEBHOOK_SECRET!)

        const appServer = getRunningExpressApp()
        const stripeEventRepo = appServer.AppDataSource.getRepository(StripeEvent)

        // Check if event already processed
        const existingEvent = await stripeEventRepo.findOne({
            where: { stripeEventId: event.id }
        })
        if (existingEvent) {
            return event
        }

        // Save event
        const stripeEvent = stripeEventRepo.create({
            stripeEventId: event.id,
            eventType: event.type,
            eventData: event.data.object,
            processed: false
        })
        await stripeEventRepo.save(stripeEvent)

        // Process event based on type
        switch (event.type) {
            case 'customer.subscription.created':
            case 'customer.subscription.updated':
                await handleSubscriptionEvent(event.data.object as Stripe.Subscription)
                break
            case 'customer.subscription.deleted':
                await handleSubscriptionDeleted(event.data.object as Stripe.Subscription)
                break
            // case 'invoice.paid':
            //     await handleInvoicePaid(event.data.object as Stripe.Invoice)
            //     break
            // case 'invoice.payment_failed':
            //     await handleInvoicePaymentFailed(event.data.object as Stripe.Invoice)
            //     break
        }

        // Mark event as processed
        stripeEvent.processed = true
        await stripeEventRepo.save(stripeEvent)

        return event
    } catch (error) {
        logger.error('Error handling webhook:', error)
        throw new InternalFlowiseError(
            StatusCodes.INTERNAL_SERVER_ERROR,
            `Failed to handle webhook: ${error instanceof Error ? error.message : String(error)}`
        )
    }
}

async function handleSubscriptionEvent(subscription: Stripe.Subscription) {
    const appServer = getRunningExpressApp()
    const subscriptionRepo = appServer.AppDataSource.getRepository(Subscription)

    const existingSubscription = await subscriptionRepo.findOne({
        where: { stripeSubscriptionId: subscription.id }
    })

    if (existingSubscription) {
        // Update existing subscription
        existingSubscription.status = subscription.status
        existingSubscription.currentPeriodStart = new Date(subscription.current_period_start * 1000)
        existingSubscription.currentPeriodEnd = new Date(subscription.current_period_end * 1000)
        await subscriptionRepo.save(existingSubscription)
    }
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
    const appServer = getRunningExpressApp()
    const subscriptionRepo = appServer.AppDataSource.getRepository(Subscription)

    await subscriptionRepo.update({ stripeSubscriptionId: subscription.id }, { status: 'canceled' })
}


export default {
    syncUsageToStripe,
    attachPaymentMethod,
    createCheckoutSession,
    updateSubscription,
    cancelSubscription,
    getUpcomingInvoice,
    createBillingPortalSession,
    getSubscriptionWithUsage,
    handleWebhook
   
}
