import Stripe from 'stripe'
import { QueryRunner } from 'typeorm'
import { StripeManager } from '../../StripeManager'
import { UsageCacheManager } from '../../UsageCacheManager'
import { Organization, OrganizationStatus } from '../database/entities/organization.entity'
import { OrganizationUser } from '../database/entities/organization-user.entity'
import { Workspace, WorkspaceName } from '../database/entities/workspace.entity'
import { WorkspaceUser } from '../database/entities/workspace-user.entity'
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

            // Get subscription details from Stripe
            const subscription = await this.stripe.subscriptions.retrieve(subscriptionId)

            // Always ensure organization is active when invoice is paid
            // This handles both reactivation and plan upgrades
            const shouldUpdateStatus = (organization as any).status !== OrganizationStatus.ACTIVE

            if (shouldUpdateStatus) {
                // Check if subscription is past_due - if so, don't reactivate yet
                if (subscription.status === 'past_due') {
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
                        return
                    }
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
                    return
                }

                await queryRunner.startTransaction()
                ;(organization as any).status = OrganizationStatus.ACTIVE
                await queryRunner.manager.save(Organization, organization)
                await queryRunner.commitTransaction()
            }

            // Check if subscription needs to be resumed after all debts are settled
            if (subscription.status === 'unpaid') {
                // Verify all debts are settled before resuming
                const allUnpaidStatuses = ['open', 'uncollectible', 'past_due']
                let hasAnyUnpaidInvoices = false
                let allUnpaidInvoiceIds: string[] = []

                for (const status of allUnpaidStatuses) {
                    const invoices = await this.stripe.invoices.list({
                        subscription: subscriptionId,
                        status: status as any,
                        limit: 100
                    })

                    if (invoices.data.length > 0) {
                        hasAnyUnpaidInvoices = true
                        allUnpaidInvoiceIds.push(...invoices.data.map((inv) => inv.id))
                    }
                }

                if (!hasAnyUnpaidInvoices) {
                    // All debts settled - resume the subscription
                    try {
                        await this.stripe.subscriptions.update(subscriptionId, {
                            pause_collection: null // This resumes the subscription
                        })
                    } catch (resumeError) {
                        logger.error(`Failed to resume subscription ${subscriptionId}: ${resumeError}`)
                        // Don't throw here - we still want to provision access even if resume fails
                    }
                }
            }

            // Always update cache with latest subscription data when invoice is paid
            // This ensures access is provisioned for plan upgrades even if org is already active
            const stripeManager = await StripeManager.getInstance()
            const cacheManager = await UsageCacheManager.getInstance()

            // Refetch subscription after potential resume to get updated status
            const updatedSubscription = await this.stripe.subscriptions.retrieve(subscriptionId)
            const currentProductId = updatedSubscription.items.data[0]?.price.product as string

            await cacheManager.updateSubscriptionDataToCache(subscriptionId, {
                productId: currentProductId,
                subsriptionDetails: stripeManager.getSubscriptionObject(updatedSubscription),
                features: await stripeManager.getFeaturesByPlan(subscriptionId, true),
                quotas: await cacheManager.getQuotas(subscriptionId, true)
            })
        } catch (error) {
            logger.error(`Error handling invoice paid: ${error}`)
            if (queryRunner && queryRunner.isTransactionActive) await queryRunner.rollbackTransaction()
            throw error
        }
    }

    public async handleInvoiceMarkedUncollectible(invoice: Stripe.Invoice, queryRunner: QueryRunner): Promise<void> {
        await this.getStripe() // Initialize stripe if not already done

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

            // Set organization status to suspended
            await queryRunner.startTransaction()
            ;(organization as any).status = OrganizationStatus.PAST_DUE
            await queryRunner.manager.save(Organization, organization)
            await queryRunner.commitTransaction()

            // Update lastLogin for workspace users in Default Workspace
            await this.updateLastLoginForDefaultWorkspaceUsers(organization.id, queryRunner)
        } catch (error) {
            logger.error(`Error handling invoice marked uncollectible: ${error}`)
            await queryRunner.rollbackTransaction()
            throw error
        } finally {
            await queryRunner.release()
        }
    }

    private async updateLastLoginForDefaultWorkspaceUsers(organizationId: string, queryRunner: QueryRunner): Promise<void> {
        try {
            // Get all organization users for the suspended organization
            const organizationUsers = await queryRunner.manager.find(OrganizationUser, {
                where: { organizationId }
            })

            if (organizationUsers.length === 0) {
                return
            }

            const userIds = organizationUsers.map((ou) => ou.userId)

            // Find workspaces named "Default Workspace" for this organization
            const defaultWorkspaces = await queryRunner.manager.find(Workspace, {
                where: {
                    organizationId,
                    name: WorkspaceName.DEFAULT_WORKSPACE
                }
            })

            if (defaultWorkspaces.length === 0) {
                return
            }

            const workspaceIds = defaultWorkspaces.map((w) => w.id)

            // Find workspace users for these users in Default Workspaces
            const workspaceUsers = await queryRunner.manager
                .createQueryBuilder(WorkspaceUser, 'wu')
                .where('wu.userId IN (:...userIds)', { userIds })
                .andWhere('wu.workspaceId IN (:...workspaceIds)', { workspaceIds })
                .getMany()

            if (workspaceUsers.length === 0) {
                return
            }

            // Update lastLogin for all found workspace users
            const currentTimestamp = new Date().toISOString()

            await queryRunner.manager
                .createQueryBuilder()
                .update(WorkspaceUser)
                .set({ lastLogin: currentTimestamp })
                .where('userId IN (:...userIds)', { userIds })
                .andWhere('workspaceId IN (:...workspaceIds)', { workspaceIds })
                .execute()
        } catch (error) {
            logger.error(`Error updating lastLogin for Default Workspace users: ${error}`, {
                organizationId
            })
            // Don't throw - this is not critical enough to fail the suspension
        }
    }
}
