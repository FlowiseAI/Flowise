import {
    BillingProvider,
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
    UsageStats,
    SubscriptionWithUsage,
    CustomerStatus,
    UsageSummary
} from './types'
import { LangfuseProvider } from '../langfuse/LangfuseProvider'
import { StripeProvider } from '../stripe/StripeProvider'
import { log } from '../config'
import Stripe from 'stripe'
import { MeterEventSummary } from '../stripe/types'

export class BillingService implements BillingProvider {
    private stripeClient: Stripe
    private paymentProvider: StripeProvider
    private usageProvider: LangfuseProvider

    constructor(stripeProvider: StripeProvider, langfuseProvider: LangfuseProvider) {
        this.paymentProvider = stripeProvider
        this.usageProvider = langfuseProvider
        this.stripeClient = new Stripe(process.env.STRIPE_SECRET_KEY!, {
            apiVersion: '2025-02-24.acacia'
        })
    }

    // Payment and subscription methods delegated to Stripe
    async listSubscriptions(params: Stripe.SubscriptionListParams): Promise<Stripe.Response<Stripe.ApiList<Stripe.Subscription>>> {
        return this.paymentProvider.listSubscriptions(params)
    }

    async createCustomer(params: CreateCustomerParams): Promise<BillingCustomer> {
        return this.paymentProvider.createCustomer(params)
    }

    async attachPaymentMethod(params: AttachPaymentMethodParams): Promise<PaymentMethod> {
        return this.paymentProvider.attachPaymentMethod(params)
    }

    async createCheckoutSession(params: CreateCheckoutSessionParams): Promise<CheckoutSession> {
        return this.paymentProvider.createCheckoutSession(params)
    }

    async createBillingPortalSession(params: CreateBillingPortalSessionParams): Promise<BillingPortalSession> {
        return this.paymentProvider.createBillingPortalSession(params)
    }

    async updateSubscription(params: UpdateSubscriptionParams): Promise<Subscription> {
        return this.paymentProvider.updateSubscription(params)
    }

    async cancelSubscription(subscriptionId: string): Promise<Subscription> {
        return this.paymentProvider.cancelSubscription(subscriptionId)
    }

    async getUpcomingInvoice(params: GetUpcomingInvoiceParams): Promise<Invoice> {
        return this.paymentProvider.getUpcomingInvoice(params)
    }

    // Usage tracking methods using Langfuse
    async getUsageSummary(customerId: string): Promise<UsageStats> {
        const now = new Date()
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
        const startTime = Math.floor(startOfMonth.getTime() / 1000)
        const endTime = Math.floor(now.getTime() / 1000)
        console.log('Getting usage summary for customer', customerId)
        const meters = await this.stripeClient.billing.meters.list()
        const summariesPromises = meters.data.map((meter) =>
            this.stripeClient.billing.meters.listEventSummaries(meter.id, {
                customer: customerId,
                start_time: startTime,
                end_time: endTime
            })
        )

        const summaries = await Promise.all(summariesPromises)
        console.log('Summaries', summaries)
        const usageByMeter: Record<string, number> = {
            ai_tokens: 0,
            compute: 0,
            storage: 0
        }
        const dailyUsageByMeter: Record<string, Array<{ date: Date; value: number }>> = {
            ai_tokens: [],
            compute: [],
            storage: []
        }
        let total_credits = 0

        summaries.forEach((summary) => {
            summary.data.forEach((rawEvent) => {
                const event = rawEvent as MeterEventSummary
                const value = Number(event.aggregated_value || 0)
                const date = new Date(event.start_time * 1000)

                // Get credit type from metadata or payload
                let creditType = 'ai_tokens' // Default to AI tokens
                try {
                    if (event.metadata) {
                        const metadata = JSON.parse(event.metadata as string)
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

                // Add to the appropriate meter
                if (creditType === 'compute' || creditType === 'storage') {
                    usageByMeter[creditType] += value
                } else {
                    // All other types count as AI tokens
                    usageByMeter.ai_tokens += value
                }

                total_credits += value

                // Add to daily usage
                if (creditType === 'compute' || creditType === 'storage') {
                    dailyUsageByMeter[creditType].push({ date, value })
                } else {
                    dailyUsageByMeter.ai_tokens.push({ date, value })
                }
            })
        })

        const subscription = await this.getActiveSubscription(customerId)

        // Get upcoming invoice data
        let upcomingInvoice: UsageSummary['upcomingInvoice'] | undefined = undefined
        try {
            if (customerId && subscription) {
                const invoiceParams: GetUpcomingInvoiceParams = {
                    customerId,
                    subscriptionId: subscription?.id
                }
                const invoice = await this.paymentProvider.getUpcomingInvoice(invoiceParams)

                // Format the invoice data for the UsageSummary
                upcomingInvoice = {
                    amount: invoice.amount,
                    currency: invoice.currency,
                    dueDate: invoice.dueDate,
                    // Calculate total credits used based on the invoice amount
                    totalCreditsUsed: Math.round(invoice.amount / (0.00004 * 100)) // Assuming $0.001 per credit
                }
            }
        } catch (error) {
            log.warn('Failed to get upcoming invoice', { error, customerId })
            // Don't fail the entire request if we can't get the invoice
        }

        return {
            total_credits,
            usageByMeter,
            dailyUsageByMeter,
            billingPeriod: subscription
                ? {
                      start: new Date(subscription.current_period_start * 1000),
                      end: new Date(subscription.current_period_end * 1000),
                      current: now
                  }
                : undefined,
            lastUpdated: new Date(),
            upcomingInvoice,
            summaries
        }
    }

    async getSubscriptionWithUsage(subscriptionId: string): Promise<SubscriptionWithUsage> {
        try {
            log.info('Getting subscription with usage', { subscriptionId })
            const subscriptions = await this.paymentProvider.listSubscriptions({
                customer: subscriptionId,
                status: 'active',
                limit: 1
            })
            const subscription = subscriptions.data[0]

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

            // Get meter events directly from Stripe
            const meters = await this.stripeClient.billing.meters.list()
            const summariesPromises = meters.data.map((meter) =>
                this.stripeClient.billing.meters.listEventSummaries(meter.id, {
                    customer: subscriptionId,
                    start_time: startTime,
                    end_time: endTime
                })
            )

            const summariesResults = await Promise.all(summariesPromises)
            const allSummaries = summariesResults.flatMap((result) => result.data)

            // Map summaries to include meter_name
            const usage = allSummaries.map((summary) => ({
                ...summary,
                meter_name: summary.meter === process.env.STRIPE_CREDITS_METER_ID ? 'credits' : 'unknown'
            }))

            return {
                id: subscription.id,
                customerId: subscription.customer as string,
                status: subscription.status as Subscription['status'],
                currentPeriodStart: new Date(subscription.current_period_start * 1000),
                currentPeriodEnd: new Date(subscription.current_period_end * 1000),
                cancelAtPeriodEnd: subscription.cancel_at_period_end,
                usage
            }
        } catch (error: any) {
            log.error('Failed to get subscription with usage', {
                error: error.message,
                subscriptionId,
                stack: error.stack
            })
            // Return a default response with empty usage array
            return {
                id: '',
                customerId: subscriptionId || '',
                status: 'unpaid',
                currentPeriodStart: new Date(),
                currentPeriodEnd: new Date(),
                cancelAtPeriodEnd: false,
                usage: [] // Ensure usage is always present
            }
        }
    }

    async handleWebhook(payload: any, signature: string): Promise<any> {
        return this.paymentProvider.handleWebhook(payload, signature)
    }

    async syncUsageToStripe(traceId?: string): Promise<{
        processedTraces: string[]
        failedTraces: Array<{ traceId: string; error: string }>
        skippedTraces: Array<{ traceId: string; reason: string }>
        meterEvents: any[]
    }> {
        let result: any = {
            meterEvents: [],
            processedTraces: [],
            failedTraces: [],
            skippedTraces: []
        }
        const startTime = Date.now()
        try {
            // Get usage data from Langfuse
            const langfuseStartTime = Date.now()
            result = await this.usageProvider.syncUsageToStripe(traceId)
            const langfuseTime = Date.now() - langfuseStartTime
            log.info('Langfuse sync completed', { durationMs: langfuseTime, traceId })

            // Sync to Stripe if needed
            if (result.creditsData && result.creditsData.length > 0) {
                const stripeStartTime = Date.now()
                const stripeResult = await this.paymentProvider.syncUsageToStripe(result.creditsData)
                const stripeTime = Date.now() - stripeStartTime
                log.info('Stripe sync completed', { durationMs: stripeTime, traceId })

                // Update with successful traces and meter events from Stripe
                result.processedTraces = stripeResult.processedTraces
                result.meterEvents = stripeResult.meterEvents

                // Add any failed events from Stripe to the failed traces
                if (stripeResult.failedEvents && stripeResult.failedEvents.length > 0) {
                    result.failedTraces.push(...stripeResult.failedEvents)
                }
            }

            const totalTime = Date.now() - startTime
            log.info('Total sync completed', {
                durationMs: totalTime,
                traceId,
                processedCount: result.processedTraces.length,
                failedCount: result.failedTraces.length,
                skippedCount: result.skippedTraces.length,
                meterEventsCount: result.meterEvents.length,
                skippedTraces: result.skippedTraces
            })
            return result
        } catch (error: any) {
            const totalTime = Date.now() - startTime
            log.error('Failed to sync usage to Stripe', { error, traceId, durationMs: totalTime })
            return {
                ...result,
                processedTraces: [],
                failedTraces: [{ traceId: traceId || 'unknown', error: error.message }],
                skippedTraces: result.skippedTraces || [],
                meterEvents: []
            }
        }
    }

    async getCustomer(customerId: string): Promise<Stripe.Customer> {
        return this.stripeClient.customers.retrieve(customerId) as Promise<Stripe.Customer>
    }

    async getActiveSubscription(customerId: string): Promise<Stripe.Subscription | null> {
        try {
            const subscriptions = await this.stripeClient.subscriptions.list({
                customer: customerId,
                status: 'active',
                limit: 1
            })
            return subscriptions.data[0] || null
        } catch (error) {
            log.error('Failed to get active subscription', { error, customerId })
            return null
        }
    }

    async getPaymentMethods(customerId: string): Promise<Stripe.Response<Stripe.ApiList<Stripe.PaymentMethod>>> {
        return this.stripeClient.paymentMethods.list({
            customer: customerId,
            type: 'card'
        })
    }
}
