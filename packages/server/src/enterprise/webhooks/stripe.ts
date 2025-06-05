import { Request, Response } from 'express'
import Stripe from 'stripe'
import { StripeManager } from '../../StripeManager'
import logger from '../../utils/logger'
import { getRunningExpressApp } from '../../utils/getRunningExpressApp'
import { Organization } from '../database/entities/organization.entity'
import { WorkspaceUser } from '../database/entities/workspace-user.entity'
import { OrganizationUserService } from '../services/organization-user.service'
import { UsageCacheManager } from '../../UsageCacheManager'

let stripe: Stripe

async function getStripe(): Promise<Stripe> {
    if (!stripe) {
        const stripeManager = await StripeManager.getInstance()
        stripe = stripeManager.getStripe()
    }
    return stripe
}

export async function handleStripeWebhook(req: Request, res: Response) {
    const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET

    if (!endpointSecret) {
        return res.status(400).json({ error: 'Webhook secret not configured' })
    }

    const sig = req.headers['stripe-signature']
    let event: Stripe.Event

    try {
        const stripeInstance = await getStripe()
        event = stripeInstance.webhooks.constructEvent(req.body, sig as string, endpointSecret)
    } catch (err) {
        logger.error(`Webhook signature verification failed: ${err}`)
        return res.status(400).json({ error: 'Invalid signature' })
    }

    switch (event.type) {
        // case 'customer.subscription.updated':
        //     if (event.data.object.status === 'canceled') await handleSubscriptionCancelled(event.data.object as Stripe.Subscription)
        //     break

        // case 'invoice.payment_succeeded':
        //     await handleInvoicePaid(event.data.object as Stripe.Invoice)
        //     break

        case 'invoice.marked_uncollectible':
            await handleInvoiceMarkedUncollectible(event.data.object as Stripe.Invoice)
    }

    res.status(200).json({ received: true })
}

async function handleInvoiceMarkedUncollectible(invoice: Stripe.Invoice): Promise<void> {
    logger.info(
        `Invoice marked uncollectible: ${JSON.stringify({
            id: invoice.id,
            customer: invoice.customer,
            subscription: invoice.subscription,
            amountPaid: invoice.amount_paid,
            currency: invoice.currency
        })}`
    )

    if (!invoice.subscription) {
        logger.warn(`No subscription ID found in invoice: ${invoice.id}`)
        return
    }

    const subscriptionId = typeof invoice.subscription === 'string' ? invoice.subscription : invoice.subscription.id
    const queryRunner = getRunningExpressApp().AppDataSource.createQueryRunner()
    await queryRunner.connect()

    try {
        await queryRunner.startTransaction()

        const organization = await queryRunner.manager.findOne(Organization, {
            where: { subscriptionId }
        })

        if (!organization) {
            logger.warn(`No organization found for subscription ID: ${subscriptionId}`)
            await queryRunner.commitTransaction()
            return
        }

        logger.info(`Found organization for subscription: ${JSON.stringify({ organizationId: organization.id, subscriptionId })}`)

        const organizationUserService = new OrganizationUserService()
        const organizationUsers = await organizationUserService.readOrganizationUserByOrganizationId(organization.id, queryRunner)
        if (organizationUsers.length === 0) {
            logger.warn(`No users found in organization: ${JSON.stringify({ organizationId: organization.id })}`)
            await queryRunner.commitTransaction()
            return
        }

        const userIds = organizationUsers.map((ou) => ou.userId)
        logger.info(
            `Found organization users: ${JSON.stringify({
                organizationId: organization.id,
                userCount: userIds.length
            })}`
        )

        const now = new Date().toISOString()
        const result = await queryRunner.manager
            .createQueryBuilder()
            .update(WorkspaceUser)
            .set({ lastLogin: now })
            .where('userId IN (:...userIds)', { userIds })
            .execute()

        logger.info(
            `Updated workspace users lastLogin: ${JSON.stringify({
                organizationId: organization.id,
                subscriptionId,
                affectedRows: result.affected
            })}`
        )

        const freeProductId = process.env.CLOUD_FREE_ID
        if (!freeProductId) {
            logger.error('CLOUD_FREE_ID environment variable not configured')
            await queryRunner.commitTransaction()
            return
        }

        try {
            const stripeInstance = await getStripe()
            const subscription = await stripeInstance.subscriptions.retrieve(subscriptionId)

            const currentProductId = subscription.items.data[0]?.price.product as string
            if (currentProductId === freeProductId) {
                logger.info('Subscription is already on free plan', { subscriptionId, productId: currentProductId })
            } else {
                const prices = await stripeInstance.prices.list({
                    product: freeProductId,
                    active: true,
                    limit: 1
                })

                if (prices.data.length === 0) {
                    logger.error('No active price found for free plan', { productId: freeProductId })
                } else {
                    const freePlanPrice = prices.data[0]

                    if (subscription.status === 'canceled' || subscription.status === 'incomplete_expired') {
                        logger.warn('Cannot update canceled or expired subscription', {
                            subscriptionId,
                            status: subscription.status
                        })
                    } else {
                        // Update subscription to free plan without creating automatic invoice
                        await stripeInstance.subscriptions.update(subscriptionId, {
                            items: [
                                {
                                    id: subscription.items.data[0].id,
                                    price: freePlanPrice.id
                                }
                            ],
                            proration_behavior: 'none', // No automatic invoice or credits
                            collection_method: 'charge_automatically'
                        })

                        // Manually create a $0 invoice for the free plan to activate subscription
                        const newInvoice = await stripeInstance.invoices.create({
                            customer: subscription.customer as string,
                            subscription: subscriptionId,
                            collection_method: 'charge_automatically',
                            description: 'Transition to free plan after payment failure'
                        })

                        // Finalize the invoice (this calculates the total - should be $0 for free plan)
                        // Stripe automatically pays $0 invoices with charge_automatically collection method
                        const finalizedInvoice = await stripeInstance.invoices.finalizeInvoice(newInvoice.id)

                        logger.info('Created and finalized invoice for free plan subscription', {
                            invoiceId: finalizedInvoice.id,
                            subscriptionId,
                            amountDue: finalizedInvoice.amount_due,
                            status: finalizedInvoice.status,
                            paid: finalizedInvoice.paid
                        })

                        if (finalizedInvoice.amount_due !== 0) {
                            logger.warn('Created invoice has non-zero amount for free plan', {
                                invoiceId: finalizedInvoice.id,
                                subscriptionId,
                                amountDue: finalizedInvoice.amount_due
                            })
                        }

                        // Get updated subscription status after payment
                        const finalSubscription = await stripeInstance.subscriptions.retrieve(subscriptionId)

                        logger.info('Updated Stripe subscription to free plan', {
                            subscriptionId,
                            oldProductId: currentProductId,
                            newProductId: freeProductId,
                            subscriptionStatus: finalSubscription.status
                        })

                        // Get cache and stripe managers
                        const cacheManager = await UsageCacheManager.getInstance()
                        const stripeManager = await StripeManager.getInstance()

                        // Update cache for the subscription
                        await cacheManager.updateSubscriptionDataToCache(subscriptionId, {
                            productId: freeProductId,
                            subsriptionDetails: stripeManager.getSubscriptionObject(finalSubscription),
                            features: await stripeManager.getFeaturesByPlan(subscriptionId, true),
                            quotas: await cacheManager.getQuotas(subscriptionId, true)
                        })

                        logger.info('Updated Redis cache with new subscription data', {
                            subscriptionId,
                            productId: freeProductId
                        })
                    }
                }
            }
        } catch (stripeError) {
            logger.error('Failed to update Stripe subscription to free plan', {
                subscriptionId,
                error: stripeError instanceof Error ? stripeError.message : stripeError,
                stack: stripeError instanceof Error ? stripeError.stack : undefined
            })
        }

        await queryRunner.commitTransaction()
    } catch (error) {
        logger.error(`Error handling invoice marked uncollectible: ${error}`)
        await queryRunner.rollbackTransaction()
        throw error
    } finally {
        await queryRunner.release()
    }
}
