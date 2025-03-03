import Stripe from 'stripe'

import {
    CreateCustomerParams,
    AttachPaymentMethodParams,
    CreateCheckoutSessionParams,
    CreateBillingPortalSessionParams,
    UpdateSubscriptionParams,
    GetUpcomingInvoiceParams,
    BillingCustomer,
    PaymentMethod,
    CheckoutSession,
    BillingPortalSession,
    Subscription,
    Invoice,
    CreditsData,
    UsageStats,
    UsageSummary
} from '../core/types'
import { log, DEFAULT_CUSTOMER_ID, BILLING_CONFIG } from '../config'
import { langfuse } from '../config'
import { getRunningExpressApp } from '../../../utils/getRunningExpressApp'
import { StripeEvent } from '../../../database/entities/StripeEvent'
import { Subscription as SubscriptionEntity } from '../../../database/entities/Subscription'
import { session } from 'passport'
// import { UserCredits } from '../../../database/entities/UserCredits'
import { MeterEventSummary } from './types'
import { UsageEvent } from '../../../database/entities'

export class StripeProvider {
    constructor(private stripeClient: Stripe) {}

    async getInvoices(params: Stripe.InvoiceListParams): Promise<Stripe.Response<Stripe.ApiList<Stripe.Invoice>>> {
        log.info('Getting invoices', { params })
        const invoices = await this.stripeClient.invoices.list(params)
        log.info('Retrieved invoices', { count: invoices.data.length })
        return invoices
    }

    async listSubscriptions(params: Stripe.SubscriptionListParams): Promise<Stripe.Response<Stripe.ApiList<Stripe.Subscription>>> {
        log.info('Listing subscriptions', { params })
        const subscriptions = await this.stripeClient.subscriptions.list(params)
        log.info('Retrieved subscriptions', { count: subscriptions.data.length })
        return subscriptions
    }

    async createCustomer(params: CreateCustomerParams): Promise<BillingCustomer> {
        try {
            log.info('Creating customer', { params })
            const customer = await this.stripeClient.customers.create({
                email: params.email,
                name: params.name,
                metadata: params.metadata
            })
            log.info('Created customer', { customerId: customer.id })
            return {
                id: customer.id,
                email: customer.email || undefined,
                name: customer.name || undefined,
                metadata: customer.metadata
            }
        } catch (error: any) {
            log.error('Failed to create customer', { error: error.message, params })
            throw error
        }
    }

    async attachPaymentMethod(params: AttachPaymentMethodParams): Promise<PaymentMethod> {
        try {
            log.info('Attaching payment method', { params })
            const paymentMethod = await this.stripeClient.paymentMethods.attach(params.paymentMethodId, {
                customer: params.customerId
            })

            // Set as default payment method
            log.info('Setting default payment method', {
                customerId: params.customerId,
                paymentMethodId: params.paymentMethodId
            })
            await this.stripeClient.customers.update(params.customerId, {
                invoice_settings: {
                    default_payment_method: params.paymentMethodId
                }
            })

            log.info('Successfully attached payment method', {
                paymentMethodId: paymentMethod.id,
                customerId: params.customerId
            })
            return {
                id: paymentMethod.id,
                type: paymentMethod.type,
                last4: paymentMethod.card?.last4,
                expMonth: paymentMethod.card?.exp_month,
                expYear: paymentMethod.card?.exp_year
            }
        } catch (error: any) {
            log.error('Failed to attach payment method', { error: error.message, params })
            throw error
        }
    }

    async createCheckoutSession(params: CreateCheckoutSessionParams): Promise<CheckoutSession> {
        try {
            log.info('Creating checkout session', { params })

            // Check for existing active subscription
            const { data: existingSubscriptions } = await this.stripeClient.subscriptions.list({
                customer: params.customerId,
                status: 'active',
                limit: 1
            })

            if (existingSubscriptions.length > 0) {
                log.warn('Customer already has an active subscription', {
                    customerId: params.customerId,
                    existingSubscriptionId: existingSubscriptions[0].id
                })
                throw new Error(
                    'Customer already has an active subscription. Please cancel the existing subscription before creating a new one.'
                )
            }

            const session = await this.stripeClient.checkout.sessions.create({
                mode: 'subscription',
                payment_method_types: ['card'],
                line_items: [
                    {
                        price: BILLING_CONFIG.PRICE_IDS.PAID_MONTHLY
                    }
                ],
                success_url: process.env.ANSWERAI_DOMAIN + '/billing?status=success',
                cancel_url: process.env.ANSWERAI_DOMAIN + '/billing?status=cancel',
                customer: params.customerId
            })
            log.info('Created checkout session', { sessionId: session.id })
            if (!session.url) {
                throw new Error('Checkout session URL is required but was not provided')
            }
            return {
                url: session.url
            }
        } catch (error: any) {
            log.error('Failed to create checkout session', { error: error.message, params })
            throw error
        }
    }

    async createBillingPortalSession(params: CreateBillingPortalSessionParams): Promise<BillingPortalSession> {
        try {
            log.info('Creating billing portal session', { params })
            const session = await this.stripeClient.billingPortal.sessions.create({
                customer: params.customerId,
                return_url: params.returnUrl
            })
            log.info('Created billing portal session', { sessionId: session.id })
            if (!session.url) {
                throw new Error('Billing portal session URL is required but was not provided')
            }
            return {
                url: session.url,
                returnUrl: params.returnUrl
            }
        } catch (error: any) {
            log.error('Failed to create billing portal session', { error: error.message, params })
            throw error
        }
    }

    async updateSubscription(params: UpdateSubscriptionParams): Promise<Subscription> {
        try {
            log.info('Updating subscription', { params })
            const subscription = await this.stripeClient.subscriptions.retrieve(params.subscriptionId)

            const updatedSubscription = await this.stripeClient.subscriptions.update(params.subscriptionId, {
                items: [
                    {
                        id: subscription.items.data[0].id,
                        price: params.priceId
                    }
                ],
                proration_behavior: 'create_prorations'
            })

            log.info('Updated subscription', { subscriptionId: updatedSubscription.id })
            return {
                id: updatedSubscription.id,
                customerId: updatedSubscription.customer as string,
                status: updatedSubscription.status as Subscription['status'],
                currentPeriodStart: new Date(updatedSubscription.current_period_start * 1000),
                currentPeriodEnd: new Date(updatedSubscription.current_period_end * 1000),
                cancelAtPeriodEnd: updatedSubscription.cancel_at_period_end
            }
        } catch (error: any) {
            log.error('Failed to update subscription', { error: error.message, params })
            throw error
        }
    }

    async cancelSubscription(subscriptionId: string): Promise<Subscription> {
        try {
            log.info('Canceling subscription', { subscriptionId })

            // First retrieve the subscription to verify it exists and get its details
            const existingSubscription = await this.stripeClient.subscriptions.retrieve(subscriptionId)
            if (!existingSubscription) {
                throw new Error('Subscription not found')
            }

            // Cancel the subscription immediately
            const subscription = await this.stripeClient.subscriptions.cancel(subscriptionId, {
                invoice_now: true, // Generate a final invoice immediately
                prorate: true // Prorate charges for the unused portion
            })

            // Update local database
            const appServer = getRunningExpressApp()
            const subscriptionRepo = appServer.AppDataSource.getRepository(SubscriptionEntity)
            await subscriptionRepo.update(
                { stripeSubscriptionId: subscriptionId },
                {
                    status: subscription.status,
                    currentPeriodEnd: new Date(subscription.current_period_end * 1000)
                }
            )

            log.info('Successfully canceled subscription', {
                subscriptionId,
                status: subscription.status,
                endDate: new Date(subscription.current_period_end * 1000)
            })

            return {
                id: subscription.id,
                customerId: subscription.customer as string,
                status: subscription.status as Subscription['status'],
                currentPeriodStart: new Date(subscription.current_period_start * 1000),
                currentPeriodEnd: new Date(subscription.current_period_end * 1000),
                cancelAtPeriodEnd: subscription.cancel_at_period_end
            }
        } catch (error: any) {
            log.error('Failed to cancel subscription', {
                error: error.message,
                subscriptionId,
                stack: error.stack
            })
            throw error
        }
    }

    async getUpcomingInvoice(params: GetUpcomingInvoiceParams): Promise<Invoice> {
        try {
            log.info('Getting upcoming invoice', { params })

            const invoiceParams: Stripe.InvoiceRetrieveUpcomingParams = {
                customer: params.customerId
            }

            if (params.subscriptionId) {
                invoiceParams.subscription = params.subscriptionId
            }

            if (params.priceId && params.subscriptionId) {
                const subscription = await this.stripeClient.subscriptions.retrieve(params.subscriptionId)
                invoiceParams.subscription_items = [
                    {
                        id: subscription.items.data[0].id,
                        price: params.priceId
                    }
                ]
            }

            const invoice = await this.stripeClient.invoices.retrieveUpcoming(invoiceParams)
            log.info('Retrieved upcoming invoice', { invoice })
            const customerId = invoice.customer as string
            if (!customerId) {
                throw new Error('Customer ID is required but was not provided')
            }
            return {
                id: `upcoming_${customerId}`,
                customerId,
                amount: invoice.total,
                currency: invoice.currency,
                status: invoice.status || 'draft',
                created: new Date(invoice.created * 1000),
                dueDate: invoice.due_date ? new Date(invoice.due_date * 1000) : undefined
            }
        } catch (error: any) {
            log.error('Failed to get upcoming invoice', { error: error.message, params })
            throw error
        }
    }

    async syncUsageToStripe(creditsData: Array<CreditsData & { fullTrace: any }>): Promise<{
        meterEvents: Stripe.Billing.MeterEvent[]
        failedEvents: Array<{ traceId: string; error: string }>
        processedTraces: string[]
    }> {
        try {
            log.info('Syncing usage to Stripe', { count: creditsData.length })

            // Validate batch size
            if (creditsData.length > BILLING_CONFIG.VALIDATION.MAX_BATCH_SIZE) {
                throw new Error(`Batch size ${creditsData.length} exceeds maximum of ${BILLING_CONFIG.VALIDATION.MAX_BATCH_SIZE}`)
            }

            // Parallel fetch meters and prepare events
            const [meters] = await Promise.all([this.stripeClient.billing.meters.list()])
            const metersMap = new Map(meters.data.map((meter) => [meter.display_name || meter.id, meter.id]))

            const BATCH_SIZE = BILLING_CONFIG.VALIDATION.MAX_BATCH_SIZE
            const DELAY_BETWEEN_BATCHES = BILLING_CONFIG.VALIDATION.BATCH_DELAY_MS
            const meterEvents: Stripe.Billing.MeterEvent[] = []
            const failedEvents: Array<{ traceId: string; error: string }> = []
            const processedTraces: string[] = []

            console.log('Syncing usage to Stripe', {
                count: creditsData.length,
                batchSize: BATCH_SIZE,
                delayBetweenBatches: DELAY_BETWEEN_BATCHES,
                metersMap
            })
            // Process in optimized batches
            for (let i = 0; i < creditsData.length; i += BATCH_SIZE) {
                const batch = creditsData.slice(i, i + BATCH_SIZE)
                const batchStartTime = Date.now()

                const batchResults = await Promise.allSettled(
                    batch.map(async (data) => {
                        const timestamp = data.timestampEpoch || Math.floor(new Date(data.metadata.timestamp).getTime() / 1000)

                        // Ensure all unknown credit types are counted as AI tokens
                        const aiTokens = data.credits.ai_tokens + (data.credits.unknown || 0)
                        const totalCredits = aiTokens + data.credits.compute + data.credits.storage
                        const totalCreditsWithMargin = Math.floor(totalCredits * BILLING_CONFIG.MARGIN_MULTIPLIER)
                        const meterId = metersMap.get('credits')

                        if (!meterId) {
                            throw new Error('No meter found for type: credits')
                        }

                        let retryCount = 0
                        console.log('Event sync', {
                            totalCreditsWithMargin,
                            meterId,
                            timestamp,
                            data,
                            retries: BILLING_CONFIG.VALIDATION.MAX_RETRIES,
                            retryCount
                        })
                        while (retryCount < BILLING_CONFIG.VALIDATION.MAX_RETRIES) {
                            try {
                                const app = getRunningExpressApp()

                                const stripeMeterEvent = {
                                    event_name: 'credits',
                                    identifier: `${data.traceId}_credits`,
                                    timestamp,
                                    payload: {
                                        value: totalCreditsWithMargin.toString(),
                                        stripe_customer_id: data.stripeCustomerId,
                                        trace_id: data.traceId,
                                        ai_tokens_credits: (aiTokens * BILLING_CONFIG.MARGIN_MULTIPLIER).toString(),
                                        compute_credits: (data.credits.compute * BILLING_CONFIG.MARGIN_MULTIPLIER).toString(),
                                        ai_tokens_cost: (
                                            (data.costs.base.ai + (data.costs.base.unknown || 0)) *
                                            BILLING_CONFIG.MARGIN_MULTIPLIER
                                        ).toFixed(6),
                                        compute_cost: (data.costs.base.compute * BILLING_CONFIG.MARGIN_MULTIPLIER).toFixed(6),
                                        total_cost_with_margin: (
                                            (data.costs.base.ai +
                                                data.costs.base.compute +
                                                data.costs.base.storage +
                                                (data.costs.base.unknown || 0)) *
                                            BILLING_CONFIG.MARGIN_MULTIPLIER
                                        ).toFixed(6)
                                    }
                                }
                                const result = await this.stripeClient.billing.meterEvents.create(stripeMeterEvent).catch((error) => {
                                    log.error('Failed to create meter event', { error: error.message, stripeMeterEvent })
                                    throw error
                                })
                                console.log('RESULT', result)
                                // const usageEvent = await app.AppDataSource.getRepository(UsageEvent).save({
                                //     traceId: data.traceId,
                                //     userId: data.userId,
                                //     organizationId: data.organizationId,
                                //     aiCredentialsOwnership: data.aiCredentialsOwnership,
                                //     resourceType: 'CREDITS',
                                //     creditsConsumed: totalCreditsWithMargin,
                                //     stripeCustomerId: data.stripeCustomerId,
                                //     // messageId: data.messageId,
                                //     timestamp,
                                //     metadata: {
                                //         stripeCustomerId: data.stripeCustomerId,
                                //         stripeMeterEvent: result,
                                //         langfuseTrace: data.fullTrace
                                //     }
                                // })

                                // Update trace metadata with billing info
                                await this.updateTraceMetadata(data, result, batchStartTime, BATCH_SIZE, i, meterId)

                                meterEvents.push(result)
                                processedTraces.push(data.traceId)
                                break
                            } catch (error) {
                                retryCount++
                                if (retryCount === BILLING_CONFIG.VALIDATION.MAX_RETRIES) {
                                    failedEvents.push({
                                        traceId: data.traceId,
                                        error: error instanceof Error ? error.message : 'Unknown error'
                                    })
                                    break
                                }
                                await new Promise((resolve) => setTimeout(resolve, BILLING_CONFIG.VALIDATION.RETRY_DELAY_MS))
                            }
                        }
                    })
                )

                if (i + BATCH_SIZE < creditsData.length) {
                    await new Promise((resolve) => setTimeout(resolve, DELAY_BETWEEN_BATCHES))
                }
            }

            return {
                meterEvents,
                failedEvents,
                processedTraces
            }
        } catch (error) {
            log.error('Error syncing usage to Stripe', { error })
            throw error
        }
    }

    private validateUsageEvent(data: CreditsData & { fullTrace: any }): string | null {
        try {
            // Check required metadata fields
            for (const field of BILLING_CONFIG.METADATA_FIELDS.REQUIRED) {
                if (!data.metadata[field]) {
                    return `Missing required metadata field: ${field}`
                }
            }

            // Validate resource amounts
            if (
                data.credits.ai_tokens > 0 &&
                (data.credits.ai_tokens < BILLING_CONFIG.AI_TOKENS.MIN_TOKENS ||
                    data.credits.ai_tokens > BILLING_CONFIG.AI_TOKENS.MAX_TOKENS_PER_REQUEST)
            ) {
                return `Invalid AI tokens amount: ${data.credits.ai_tokens}`
            }

            if (
                data.credits.compute > 0 &&
                (data.usage.computeMinutes < BILLING_CONFIG.COMPUTE.MIN_MINUTES ||
                    data.usage.computeMinutes > BILLING_CONFIG.COMPUTE.MAX_MINUTES_PER_REQUEST)
            ) {
                return `Invalid compute minutes: ${data.usage.computeMinutes}`
            }

            if (
                data.credits.storage > 0 &&
                (data.usage.storageGB < BILLING_CONFIG.STORAGE.MIN_GB || data.usage.storageGB > BILLING_CONFIG.STORAGE.MAX_GB_PER_REQUEST)
            ) {
                return `Invalid storage GB: ${data.usage.storageGB}`
            }

            return null
        } catch (error: any) {
            return `Validation error: ${error.message}`
        }
    }

    private async updateTraceMetadata(
        data: CreditsData & { fullTrace: any },
        result: Stripe.Billing.MeterEvent,
        batchStartTime: number,
        batchSize: number,
        batchIndex: number,
        meterId: string
    ): Promise<void> {
        const totalCredits = Object.values(data.credits).reduce((sum, val) => sum + val, 0)
        await langfuse.trace({
            id: data.traceId,
            timestamp: data.fullTrace?.timestamp,
            metadata: {
                ...data.fullTrace?.metadata,
                billing_status: 'processed',
                meter_event_id: result.identifier,
                billing_details: {
                    total_credits: Math.floor(totalCredits * BILLING_CONFIG.MARGIN_MULTIPLIER),
                    breakdown: {
                        ai_tokens: this.calculateResourceBreakdown(data.credits.ai_tokens, data.costs.base.ai, totalCredits),
                        compute: this.calculateResourceBreakdown(data.credits.compute, data.costs.base.compute, totalCredits),
                        storage: this.calculateResourceBreakdown(data.credits.storage, data.costs.base.storage, totalCredits)
                    },
                    costs: {
                        total_base_cost: data.costs.base.ai + data.costs.base.compute + data.costs.base.storage,
                        total_with_margin:
                            (data.costs.base.ai + data.costs.base.compute + data.costs.base.storage) * BILLING_CONFIG.MARGIN_MULTIPLIER,
                        currency: 'USD'
                    },
                    billing_config: {
                        margin_multiplier: BILLING_CONFIG.MARGIN_MULTIPLIER,
                        environment: process.env.NODE_ENV || 'development',
                        version: '1.0.0',
                        meter_id: meterId
                    },
                    event: {
                        customer_id: data.stripeCustomerId,
                        timestamp: result.timestamp,
                        event_name: 'credits',
                        meter_identifier: result.identifier,
                        identifier_production: process.env.NODE_ENV === 'production' ? result.identifier : undefined
                    },
                    processing: {
                        started_at: new Date(batchStartTime).toISOString(),
                        completed_at: new Date().toISOString(),
                        duration_ms: Date.now() - batchStartTime,
                        batch_size: batchSize,
                        batch_index: batchIndex
                    }
                }
            }
        })
    }

    private calculateResourceBreakdown(credits: number, cost: number, totalCredits: number) {
        return {
            base_credits: credits,
            credits_with_margin: credits * BILLING_CONFIG.MARGIN_MULTIPLIER,
            base_cost: cost,
            cost_with_margin: cost * BILLING_CONFIG.MARGIN_MULTIPLIER,
            rate: credits > 0 ? cost / credits : 0,
            percentage: (credits / totalCredits) * 100
        }
    }

    private processBatchResults(
        batchResults: PromiseSettledResult<any>[],
        batch: Array<CreditsData & { fullTrace: any }>,
        meterEvents: Stripe.Billing.MeterEvent[],
        failedEvents: Array<{ traceId: string; error: string }>,
        processedTraces: string[]
    ): void {
        batchResults.forEach((result, index) => {
            if (result.status === 'fulfilled') {
                meterEvents.push(result.value.result)
                processedTraces.push(result.value.traceId)
            } else {
                const error = result.reason
                // Only add to failedEvents if it's not a resource_missing error that was handled
                if (!(error.code === 'resource_missing' && error.param === 'payload[stripe_customer_id]')) {
                    failedEvents.push({
                        traceId: batch[index].traceId,
                        error: error?.message || 'Unknown error during meter event creation'
                    })
                }
            }
        })
    }

    async getMeterEventSummaries(
        customerId: string,
        startTime?: number,
        endTime?: number
    ): Promise<Stripe.Response<Stripe.ApiList<Stripe.Billing.MeterEventSummary & { meter_name: string }>>> {
        try {
            log.info('Getting meter event summaries', { customerId, startTime, endTime })

            // If no time range provided, default to current month
            if (!startTime || !endTime) {
                const now = new Date()
                const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
                startTime = Math.floor(startOfMonth.getTime() / 1000)
                endTime = Math.floor(now.getTime() / 1000)
            }

            // Align timestamps with daily boundaries (UTC midnight)
            const alignedStartTime = Math.floor(startTime / 86400) * 86400 // Round down to nearest day
            const alignedEndTime = Math.ceil(endTime / 86400) * 86400 // Round up to nearest day

            log.info('Aligned timestamps', {
                originalStart: new Date(startTime * 1000),
                originalEnd: new Date(endTime * 1000),
                alignedStart: new Date(alignedStartTime * 1000),
                alignedEnd: new Date(alignedEndTime * 1000)
            })

            // Get all meters for this customer
            const meters = await this.stripeClient.billing.meters.list()
            const summariesPromises = meters.data.map((meter) =>
                this.stripeClient.billing.meters.listEventSummaries(meter.id, {
                    customer: customerId,
                    start_time: alignedStartTime,
                    end_time: alignedEndTime,
                    value_grouping_window: 'day'
                })
            )

            const summariesResults = await Promise.all(summariesPromises)

            // Combine all summaries and add meter names
            const combinedData = summariesResults
                .flatMap((result) => result.data)
                .map((summary) => {
                    // Map meter IDs to their names based on config
                    let meterName = 'Unknown'
                    if (summary.meter === BILLING_CONFIG.CREDITS_METER_ID) {
                        meterName = BILLING_CONFIG.CREDITS_METER_NAME
                    }

                    return {
                        ...summary,
                        meter_name: meterName
                    }
                })

            log.info('Retrieved meter event summaries', {
                count: combinedData.length,
                startTime: new Date(alignedStartTime * 1000),
                endTime: new Date(alignedEndTime * 1000)
            })

            return {
                lastResponse: {
                    headers: {},
                    requestId: '',
                    statusCode: 200,
                    apiVersion: '2024-01-01',
                    idempotencyKey: '',
                    stripeAccount: ''
                },
                object: 'list',
                data: combinedData,
                has_more: false,
                url: '/v1/billing/meter-event-summaries'
            }
        } catch (error: any) {
            log.error('Failed to get meter event summaries', { error: error.message, customerId })
            throw error
        }
    }

    async getSubscriptionWithUsage(subscriptionId?: string): Promise<Subscription & { usage?: any }> {
        try {
            log.info('Getting subscription with usage', { subscriptionId })
            const { data: [subscription] = [] } = await this.stripeClient.subscriptions.list({
                customer: subscriptionId,
                status: 'active',
                limit: 1
            })

            // If no active subscription found, return a default response
            if (!subscription) {
                log.info('No active subscription found', { subscriptionId })
                return {
                    id: '',
                    customerId: subscriptionId || '',
                    status: 'unpaid',
                    currentPeriodStart: new Date(),
                    currentPeriodEnd: new Date(),
                    cancelAtPeriodEnd: false,
                    usage: []
                }
            }

            // Get usage for current month
            const now = new Date()
            const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
            const startTime = Math.floor(startOfMonth.getTime() / 1000)
            const endTime = Math.floor(now.getTime() / 1000)

            // Align timestamps with daily boundaries
            const alignedStartTime = Math.floor(startTime / 86400) * 86400
            const alignedEndTime = Math.ceil(endTime / 86400) * 86400

            let summaries
            try {
                summaries = await this.getMeterEventSummaries(subscription.customer as string, alignedStartTime, alignedEndTime)
            } catch (error) {
                log.warn('Failed to get meter event summaries, defaulting to empty usage', {
                    error,
                    subscriptionId: subscription.id,
                    customerId: subscription.customer
                })
                summaries = { data: [] }
            }

            return {
                ...subscription,
                id: subscription.id,
                customerId: subscription.customer as string,
                status: subscription.status as Subscription['status'],
                currentPeriodStart: new Date(subscription.current_period_start * 1000),
                currentPeriodEnd: new Date(subscription.current_period_end * 1000),
                cancelAtPeriodEnd: subscription.cancel_at_period_end,
                usage: summaries.data
            }
        } catch (error: any) {
            log.error('Failed to get subscription with usage', {
                error: error.message,
                subscriptionId,
                stack: error.stack
            })
            // Return a default response instead of throwing
            return {
                id: '',
                customerId: subscriptionId || '',
                status: 'unpaid',
                currentPeriodStart: new Date(),
                currentPeriodEnd: new Date(),
                cancelAtPeriodEnd: false,
                usage: []
            }
        }
    }

    async getUsageSummary(customerId: string): Promise<UsageSummary> {
        try {
            // First get the active subscription to determine billing period
            const subscriptions = await this.stripeClient.subscriptions.list({
                customer: customerId,
                status: 'active',
                limit: 1
            })
            const subscription = subscriptions.data[0]

            // Get billing period from subscription or default to current month
            const now = new Date()
            const billingStart = subscription
                ? new Date(subscription.current_period_start * 1000)
                : new Date(now.getFullYear(), now.getMonth(), 1)
            const billingEnd = subscription
                ? new Date(subscription.current_period_end * 1000)
                : new Date(now.getFullYear(), now.getMonth() + 1, 0)

            // Get meter events for the billing period
            const startTime = Math.floor(billingStart.getTime() / 1000)
            const endTime = Math.floor(billingEnd.getTime() / 1000)

            const meters = await this.stripeClient.billing.meters.list()
            const summariesPromises = meters.data.map((meter) =>
                this.stripeClient.billing.meters.listEventSummaries(meter.id, {
                    customer: customerId,
                    start_time: startTime,
                    end_time: endTime
                })
            )

            // Fetch upcoming invoice data in parallel with usage data
            const [summaries, upcomingInvoiceData] = await Promise.all([
                Promise.all(summariesPromises),
                this.fetchUpcomingInvoiceData(customerId, subscription?.id)
            ])

            // Initialize usage tracking
            const dailyUsage: Record<
                string,
                {
                    date: string
                    aiTokens: number
                    compute: number
                    storage: number
                    total: number
                }
            > = {}

            let totalAiTokens = 0
            let totalCompute = 0
            let totalStorage = 0

            // Process all summaries
            summaries.forEach((summary) => {
                summary.data.forEach((rawEvent) => {
                    const event = rawEvent as MeterEventSummary
                    const value = Number(event.aggregated_value || 0)
                    const date = new Date(event.start_time * 1000).toISOString().split('T')[0]

                    // Get credit type from metadata or payload
                    let creditType = 'ai_tokens' // Default to AI tokens
                    try {
                        if (event.metadata) {
                            const metadata = JSON.parse(event.metadata)
                            if (metadata.credit_type) {
                                creditType = metadata.credit_type
                            }
                        }
                        if (event.payload?.credit_type) {
                            creditType = event.payload.credit_type
                        }
                    } catch (e) {
                        log.warn('Failed to parse event metadata', { error: e, event })
                    }

                    // Initialize daily record if not exists
                    if (!dailyUsage[date]) {
                        dailyUsage[date] = {
                            date,
                            aiTokens: 0,
                            compute: 0,
                            storage: 0,
                            total: 0
                        }
                    }

                    // Update totals and daily usage based on credit type
                    switch (creditType) {
                        case 'compute':
                            totalCompute += value
                            dailyUsage[date].compute += value
                            break
                        case 'storage':
                            totalStorage += value
                            dailyUsage[date].storage += value
                            break
                        default:
                            // Default to AI tokens for unknown types
                            totalAiTokens += value
                            dailyUsage[date].aiTokens += value
                    }
                    dailyUsage[date].total += value
                })
            })

            // Calculate plan limits
            const planLimits = subscription ? BILLING_CONFIG.PLAN_LIMITS.PRO : BILLING_CONFIG.PLAN_LIMITS.FREE
            const aiTokensLimit = Math.floor(planLimits * 0.5) // 50% allocation for AI tokens
            const computeLimit = Math.floor(planLimits * 0.3) // 30% allocation for compute
            const storageLimit = Math.floor(planLimits * 0.2) // 20% allocation for storage

            // Calculate total usage
            const totalUsage = totalAiTokens + totalCompute + totalStorage

            // Check if over limit
            const isOverLimit = totalUsage > planLimits

            // Format daily usage array sorted by date
            const dailyUsageArray = Object.values(dailyUsage).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

            return {
                currentPlan: {
                    name: subscription ? 'Pro' : 'Free',
                    status: subscription?.status === 'active' ? 'active' : 'inactive',
                    creditsIncluded: planLimits
                },
                usageDashboard: {
                    aiTokens: {
                        used: totalAiTokens,
                        total: aiTokensLimit,
                        rate: 0.01,
                        cost: totalAiTokens * 0.01
                    },
                    compute: {
                        used: totalCompute,
                        total: computeLimit,
                        rate: 0.02,
                        cost: totalCompute * 0.02
                    },
                    storage: {
                        used: totalStorage,
                        total: storageLimit,
                        rate: 0.001,
                        cost: totalStorage * 0.001
                    }
                },
                billingPeriod: {
                    start: billingStart,
                    end: billingEnd,
                    current: now
                },
                pricing: {
                    aiTokensRate: '1,000 tokens = 100 Credits ($0.1)',
                    computeRate: '1 minute = 50 credits ($0.05)',
                    storageRate: '1 GB/month = 500 credits ($0.5)',
                    creditRate: '1 Credit = $0.001 USD'
                },
                dailyUsage: dailyUsageArray,
                isOverLimit,
                upcomingInvoice: upcomingInvoiceData
            }
        } catch (error) {
            log.error('Error getting usage summary:', error)
            throw error
        }
    }

    /**
     * Fetches upcoming invoice data for a customer
     * @param customerId The Stripe customer ID
     * @param subscriptionId Optional subscription ID
     * @returns Formatted upcoming invoice data or undefined if not available
     */
    private async fetchUpcomingInvoiceData(
        customerId: string,
        subscriptionId?: string
    ): Promise<UsageSummary['upcomingInvoice'] | undefined> {
        try {
            const invoiceParams: Stripe.InvoiceRetrieveUpcomingParams = {
                customer: customerId
            }

            if (subscriptionId) {
                invoiceParams.subscription = subscriptionId
            }

            const invoice = await this.stripeClient.invoices.retrieveUpcoming(invoiceParams)

            if (!invoice) {
                return undefined
            }

            // Extract line items for detailed breakdown
            const lineItems = invoice.lines.data.map((item) => ({
                description: item.description || 'Usage',
                amount: item.amount,
                quantity: item.quantity !== null ? item.quantity : undefined,
                period: item.period
                    ? {
                          start: new Date(item.period.start * 1000),
                          end: new Date(item.period.end * 1000)
                      }
                    : undefined
            }))

            // Calculate total credits used from line items
            // This is an approximation based on the invoice amount and the credit rate
            const totalCreditsUsed = Math.round(invoice.total / (BILLING_CONFIG.CREDIT_TO_USD * 100))

            return {
                amount: invoice.total,
                currency: invoice.currency,
                dueDate: invoice.due_date ? new Date(invoice.due_date * 1000) : undefined,
                periodStart: invoice.period_start ? new Date(invoice.period_start * 1000) : undefined,
                periodEnd: invoice.period_end ? new Date(invoice.period_end * 1000) : undefined,
                lineItems,
                totalCreditsUsed
            }
        } catch (error) {
            // Log the error but don't fail the entire request
            log.warn('Failed to fetch upcoming invoice data', { error, customerId })
            return undefined
        }
    }

    async handleWebhook(payload: any, signature: string): Promise<any> {
        try {
            const event = this.stripeClient.webhooks.constructEvent(payload, signature, process.env.STRIPE_WEBHOOK_SECRET!)

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
                    await this.handleSubscriptionEvent(event.data.object as Stripe.Subscription)
                    break
                case 'customer.subscription.deleted':
                    await this.handleSubscriptionDeleted(event.data.object as Stripe.Subscription)
                    break
                // case 'invoice.paid':
                //     await this.handleInvoicePaid(event.data.object as Stripe.Invoice)
                //     break
                // case 'invoice.payment_failed':
                //     await this.handleInvoicePaymentFailed(event.data.object as Stripe.Invoice)
                //     break
            }

            // Mark event as processed
            stripeEvent.processed = true
            await stripeEventRepo.save(stripeEvent)

            return event
        } catch (error) {
            log.error('Error handling webhook:', error)
            throw error
        }
    }

    private async handleSubscriptionEvent(subscription: Stripe.Subscription) {
        const appServer = getRunningExpressApp()
        const subscriptionRepo = appServer.AppDataSource.getRepository(SubscriptionEntity)

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

    private async handleSubscriptionDeleted(subscription: Stripe.Subscription) {
        const appServer = getRunningExpressApp()
        const subscriptionRepo = appServer.AppDataSource.getRepository(SubscriptionEntity)

        await subscriptionRepo.update({ stripeSubscriptionId: subscription.id }, { status: 'canceled' })
    }

    // private async handleInvoicePaid(invoice: Stripe.Invoice) {
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

    // private async handleInvoicePaymentFailed(invoice: Stripe.Invoice) {
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

    async getCustomerByEmail(email: string): Promise<BillingCustomer | null> {
        try {
            log.info('Getting customer by email', { email })
            const customers = await this.stripeClient.customers.list({
                email,
                limit: 1
            })

            if (customers.data.length === 0) {
                return null
            }

            const customer = customers.data[0]
            return {
                id: customer.id,
                email: customer.email || undefined,
                name: customer.name || undefined,
                metadata: customer.metadata
            }
        } catch (error: any) {
            log.error('Failed to get customer by email', { error: error.message, email })
            throw error
        }
    }
}
