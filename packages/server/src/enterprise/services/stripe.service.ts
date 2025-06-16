import Stripe from 'stripe'
import { QueryRunner } from 'typeorm'
import { StripeManager } from '../../StripeManager'
import { UsageCacheManager } from '../../UsageCacheManager'
import { Organization, OrganizationStatus } from '../database/entities/organization.entity'
import logger from '../../utils/logger'

// Note: Organization entity will have a 'status' field added later
// This will support values like 'active', 'suspended', etc.

export class StripeService {
    private stripe: Stripe

    constructor() {
        // stripe will be initialized in methods that use it
    }

    private async getStripe(): Promise<Stripe> {
        if (!this.stripe) {
            const stripeManager = await StripeManager.getInstance()
            this.stripe = stripeManager.getStripe()
        }
        return this.stripe
    }

    public async handleInvoicePaid(invoice: Stripe.Invoice, queryRunner: QueryRunner): Promise<void> {
        await this.getStripe() // Initialize stripe if not already done
        logger.info(
            `Invoice paid: ${JSON.stringify({
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

        try {
            const organization = await queryRunner.manager.findOne(Organization, {
                where: { subscriptionId }
            })

            if (!organization) {
                logger.warn(`No organization found for subscription ID: ${subscriptionId}`)
                return
            }

            logger.info(
                `Found organization for subscription: ${JSON.stringify({
                    organizationId: organization.id,
                    subscriptionId,
                    status: (organization as any).status
                })}`
            )

            // Get subscription details from Stripe
            const subscription = await this.stripe.subscriptions.retrieve(subscriptionId)

            logger.info(
                `Current subscription details: ${JSON.stringify({
                    subscriptionId,
                    status: subscription.status
                })}`
            )

            // Always ensure organization is active when invoice is paid
            // This handles both reactivation and plan upgrades
            const shouldUpdateStatus = (organization as any).status !== OrganizationStatus.ACTIVE

            if (shouldUpdateStatus) {
                // Check if subscription is past_due - if so, don't reactivate yet
                if (subscription.status === 'past_due') {
                    logger.info(`Subscription is still past_due, not reactivating: ${subscriptionId}`)
                    return
                }

                // Check for all uncollectible invoices and ensure they are all settled
                // Customer must pay/settle ALL uncollectible invoices before reactivation
                const uncollectibleInvoices = await this.stripe.invoices.list({
                    subscription: subscriptionId,
                    status: 'uncollectible',
                    limit: 100 // Get all uncollectible invoices
                })

                if (uncollectibleInvoices.data.length > 0) {
                    // Check if all uncollectible invoices have been settled (paid)
                    const unsettledUncollectible = uncollectibleInvoices.data.filter((invoice) => !invoice.paid)
                    if (unsettledUncollectible.length > 0) {
                        logger.info(
                            `Found ${unsettledUncollectible.length} unsettled uncollectible invoices for subscription: ${subscriptionId}. Keeping organization suspended.`,
                            {
                                unsettledInvoiceIds: unsettledUncollectible.map((inv) => inv.id)
                            }
                        )
                        return
                    }
                    logger.info(
                        `All ${uncollectibleInvoices.data.length} uncollectible invoices have been settled for subscription: ${subscriptionId}`
                    )
                }

                // Check for any unpaid invoices across all possible unpaid statuses
                // This ensures no outstanding debt remains before reactivation
                const unpaidStatuses = ['open', 'uncollectible']
                let hasUnpaidInvoices = false
                let unpaidInvoiceIds: string[] = []

                for (const status of unpaidStatuses) {
                    const invoices = await this.stripe.invoices.list({
                        subscription: subscriptionId,
                        status: status as any,
                        limit: 100
                    })

                    if (invoices.data.length > 0) {
                        hasUnpaidInvoices = true
                        unpaidInvoiceIds.push(...invoices.data.map((inv) => inv.id))
                    }
                }

                if (hasUnpaidInvoices) {
                    logger.info(`Found unpaid invoices for subscription: ${subscriptionId}. Keeping organization suspended.`, {
                        unpaidInvoiceIds
                    })
                    return
                }

                logger.info(`All invoices paid for subscription: ${subscriptionId}. Reactivating organization.`, {
                    subscriptionId,
                    organizationId: organization.id,
                    uncollectibleInvoicesChecked: uncollectibleInvoices.data.length,
                    unpaidStatusesChecked: unpaidStatuses
                })

                await queryRunner.startTransaction()
                ;(organization as any).status = OrganizationStatus.ACTIVE
                await queryRunner.manager.save(Organization, organization)
                await queryRunner.commitTransaction()

                logger.info('Organization reactivated after payment', {
                    subscriptionId,
                    organizationId: organization.id,
                    status: (organization as any).status
                })
            } else {
                logger.info('Organization already active, provisioning access for paid invoice', {
                    subscriptionId,
                    organizationId: organization.id,
                    invoiceId: invoice.id
                })
            }

            // Always update cache with latest subscription data when invoice is paid
            // This ensures access is provisioned for plan upgrades even if org is already active
            const stripeManager = await StripeManager.getInstance()
            const cacheManager = await UsageCacheManager.getInstance()
            const currentProductId = subscription.items.data[0]?.price.product as string

            await cacheManager.updateSubscriptionDataToCache(subscriptionId, {
                productId: currentProductId,
                subsriptionDetails: stripeManager.getSubscriptionObject(subscription),
                features: await stripeManager.getFeaturesByPlan(subscriptionId, true),
                quotas: await cacheManager.getQuotas(subscriptionId, true)
            })

            logger.info('Subscription access provisioned after payment', {
                subscriptionId,
                organizationId: organization.id,
                productId: currentProductId,
                invoiceId: invoice.id
            })
        } catch (error) {
            logger.error(`Error handling invoice paid: ${error}`)
            if (queryRunner && queryRunner.isTransactionActive) await queryRunner.rollbackTransaction()
            throw error
        }
    }

    public async handleInvoiceMarkedUncollectible(invoice: Stripe.Invoice, queryRunner: QueryRunner): Promise<void> {
        await this.getStripe() // Initialize stripe if not already done
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

        try {
            const organization = await queryRunner.manager.findOne(Organization, {
                where: { subscriptionId }
            })

            if (!organization) {
                logger.warn(`No organization found for subscription ID: ${subscriptionId}`)
                await queryRunner.commitTransaction()
                return
            }

            logger.info(`Found organization for subscription: ${JSON.stringify({ organizationId: organization.id, subscriptionId })}`)

            // Set organization status to suspended
            await queryRunner.startTransaction()
            ;(organization as any).status = OrganizationStatus.PAST_DUE
            await queryRunner.manager.save(Organization, organization)
            await queryRunner.commitTransaction()

            logger.info('Organization suspended due to uncollectible invoice', {
                subscriptionId,
                organizationId: organization.id,
                status: (organization as any).status
            })
        } catch (error) {
            logger.error(`Error handling invoice marked uncollectible: ${error}`)
            await queryRunner.rollbackTransaction()
            throw error
        } finally {
            await queryRunner.release()
        }
    }
}
