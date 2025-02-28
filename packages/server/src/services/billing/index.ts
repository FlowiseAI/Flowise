import { BillingService, LangfuseProvider, StripeProvider, stripe as stripeClient } from '../../aai-utils/billing'
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
export const billingService = new BillingService(new StripeProvider(stripeClient), new LangfuseProvider())

async function getUsageSummary(customerId?: string) {
    logger.info('Getting usage stats', { customerId })
    try {
        if (!customerId) {
            throw new InternalFlowiseError(StatusCodes.UNAUTHORIZED, 'User has no associated Stripe customer')
        }
        return await billingService.getUsageSummary(customerId)
    } catch (error) {
        logger.error('Error getting usage stats:', { error, customerId })
        throw new InternalFlowiseError(
            StatusCodes.INTERNAL_SERVER_ERROR,
            `Failed to get usage statistics: ${error instanceof Error ? error.message : String(error)}`
        )
    }
}

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

// async function createCustomer(params: CreateCustomerParams) {
//     try {
//         // Check if customer already exists with this email
//         const existingCustomer = await billingService.getCustomerByEmail(params.email)
//         if (existingCustomer) {
//             throw new InternalFlowiseError(StatusCodes.BAD_REQUEST, 'Customer already exists')
//         }
//         return await billingService.createCustomer(params)
//     } catch (error) {
//         if (error instanceof InternalFlowiseError) {
//             throw error
//         }
//         logger.error('Error creating customer:', error)
//         throw new InternalFlowiseError(
//             StatusCodes.INTERNAL_SERVER_ERROR,
//             `Failed to create customer: ${error instanceof Error ? error.message : String(error)}`
//         )
//     }
// }

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
        const event = stripeClient.webhooks.constructEvent(payload, signature, process.env.STRIPE_WEBHOOK_SECRET!)

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

// async function handleInvoicePaid(invoice: Stripe.Invoice) {
//     // Update credit balance
//     const appServer = getRunningExpressApp()
//     const userCreditsRepo = appServer.AppDataSource.getRepository(UserCredits)

//     const userCredits = await userCreditsRepo.findOne({
//         where: { stripeCustomerId: invoice.customer as string }
//     })

//     if (userCredits) {
//         userCredits.lastInvoiceAt = new Date()
//         await userCreditsRepo.save(userCredits)
//     }
// }

// async function handleInvoicePaymentFailed(invoice: Stripe.Invoice) {
//     // Handle failed payment - maybe send notification or update status
//     const appServer = getRunningExpressApp()
//     const userCreditsRepo = appServer.AppDataSource.getRepository(UserCredits)

//     const userCredits = await userCreditsRepo.findOne({
//         where: { stripeCustomerId: invoice.customer as string }
//     })

//     if (userCredits) {
//         userCredits.isBlocked = true
//         userCredits.blockReason = 'Payment failed'
//         await userCreditsRepo.save(userCredits)
//     }
// }

// async function trackUsage(userId: string, type: string, amount: number) {
//     try {
//         logger.info('Tracking usage event', { userId, type, amount })
//         const appServer = getRunningExpressApp()
//         const userRepo = appServer.AppDataSource.getRepository('User')

//         // Get user's Stripe customer ID
//         const user = await userRepo.findOne({ where: { id: userId } })
//         if (!user?.stripeCustomerId) {
//             throw new InternalFlowiseError(StatusCodes.UNAUTHORIZED, 'User has no associated Stripe customer')
//         }

//         // Create a meter event
//         const meterEvent = {
//             customerId: user.stripeCustomerId,
//             type,
//             amount,
//             timestamp: new Date()
//         }

//         // Get usage stats before the event
//         const beforeStats = await billingService.getUsageSummary(user.stripeCustomerId)
//         const beforeTotal = beforeStats.total_sparks || 0

//         // Record the event
//         await billingService.syncUsageToStripe([
//             {
//                 traceId: `manual-${Date.now()}`,
//                 stripeCustomerId: user.stripeCustomerId,
//                 subscriptionTier: 'free',
//                 timestamp: new Date().toISOString(),
//                 timestampEpoch: Math.floor(Date.now() / 1000),
//                 sparks: {
//                     ai_tokens: type === 'token' ? amount : 0,
//                     compute: type === 'compute' ? amount : 0,
//                     storage: type === 'storage' ? amount : 0,
//                     total: amount
//                 },
//                 metadata: {},
//                 usage: {
//                     tokens: type === 'token' ? amount : 0,
//                     computeMinutes: type === 'compute' ? amount : 0,
//                     storageGB: type === 'storage' ? amount : 0,
//                     totalCost: 0,
//                     models: []
//                 },
//                 costs: {
//                     base: {
//                         ai: type === 'token' ? amount * 0.001 : 0,
//                         compute: type === 'compute' ? amount * 0.001 : 0,
//                         storage: type === 'storage' ? amount * 0.001 : 0,
//                         total: amount * 0.001
//                     },
//                     withMargin: {
//                         total: amount * 0.001,
//                         marginMultiplier: 1
//                     }
//                 }
//             }
//         ])

//         // Get usage stats after the event
//         const afterStats = await billingService.getUsageSummary(user.stripeCustomerId)
//         const afterTotal = afterStats.total_sparks || 0

//         return {
//             remainingCredits: Math.max(0, beforeTotal - (afterTotal - beforeTotal))
//         }
//     } catch (error) {
//         logger.error('Error tracking usage:', error)
//         throw new InternalFlowiseError(
//             StatusCodes.INTERNAL_SERVER_ERROR,
//             `Failed to track usage: ${error instanceof Error ? error.message : String(error)}`
//         )
//     }
// }

export default {
    getUsageSummary,
    syncUsageToStripe,
    // createCustomer,
    attachPaymentMethod,
    createCheckoutSession,
    updateSubscription,
    cancelSubscription,
    getUpcomingInvoice,
    createBillingPortalSession,
    getSubscriptionWithUsage,
    handleWebhook
    // trackUsage
}
