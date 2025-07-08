import Stripe from 'stripe'
import { QueryRunner } from 'typeorm'
import { StripeManager } from '../../StripeManager'
import { UsageCacheManager } from '../../UsageCacheManager'
import { Organization, OrganizationStatus } from '../database/entities/organization.entity'
import { OrganizationUser } from '../database/entities/organization-user.entity'
import { Workspace, WorkspaceName } from '../database/entities/workspace.entity'
import { WorkspaceUser } from '../database/entities/workspace-user.entity'
import { OrganizationErrorMessage, OrganizationService } from './organization.service'
import logger from '../../utils/logger'

enum SubscriptionStatus {
    INCOMPLETE = 'incomplete',
    INCOMPLETE_EXPIRED = 'incomplete_expired',
    TRIALING = 'trialing',
    ACTIVE = 'active',
    PAST_DUE = 'past_due',
    CANCELED = 'canceled',
    UNPAID = 'unpaid',
    PAUSED = 'paused'
}

enum InvoiceStatus {
    DRAFT = 'draft',
    OPEN = 'open',
    PAID = 'paid',
    UNCOLLECTIBLE = 'uncollectible',
    VOID = 'void'
}

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

    public async reactivateOrganizationIfEligible(invoice: Stripe.Invoice, queryRunner: QueryRunner): Promise<void> {
        try {
            await this.getStripe() // Initialize stripe if not already done

            if (!invoice.subscription) {
                logger.warn(`No subscription ID found in invoice: ${invoice.id}`)
                return
            }

            const subscriptionId = typeof invoice.subscription === 'string' ? invoice.subscription : invoice.subscription.id

            const organizationService = new OrganizationService()
            const organization = await organizationService.readOrganizationBySubscriptionId(subscriptionId, queryRunner)
            if (!organization) {
                logger.warn(`${OrganizationErrorMessage.ORGANIZATION_NOT_FOUND} for subscription ID: ${subscriptionId}`)
                return
            }

            if (organization.status === OrganizationStatus.ACTIVE) {
                logger.info(`Organization ${organization.id} is already active`)
                return
            }

            if (organization.status === OrganizationStatus.UNDER_REVIEW) {
                logger.info(`Organization ${organization.id} is under review`)
                return
            }

            const uncollectibleInvoices = await this.stripe.invoices.list({
                subscription: subscriptionId,
                status: InvoiceStatus.UNCOLLECTIBLE,
                limit: 100
            })

            if (uncollectibleInvoices.data.length > 0) {
                logger.info(`Organization ${organization.id} has uncollectible invoices`)
                return
            }

            await organizationService.updateOrganization(
                {
                    id: organization.id,
                    status: OrganizationStatus.ACTIVE,
                    updatedBy: organization.createdBy // Use the organization's creator as updater
                },
                queryRunner,
                true // fromStripe = true to allow status updates
            )

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

            logger.info(`Successfully reactivated organization ${organization.id} and updated cache for subscription ${subscriptionId}`)
        } catch (error) {
            logger.error(`stripe.service.reactivateOrganizationIfEligible: ${error}`)
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
                return
            }

            // Set organization status to suspended
            const organizationService = new OrganizationService()
            await organizationService.updateOrganization(
                {
                    id: organization.id,
                    status: OrganizationStatus.PAST_DUE,
                    updatedBy: organization.createdBy // Use the organization's creator as updater
                },
                queryRunner,
                true // fromStripe = true to allow status updates
            )

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
