import {
    BillingProvider,
    CreateCheckoutSessionParams,
    GetUpcomingInvoiceParams,
    CheckoutSession,
    UsageStats,
    UsageSummary,
    GetUsageEventsParams,
    UsageEventsResponse
} from './types'
import { LangfuseProvider } from '../langfuse/LangfuseProvider'
import { StripeProvider } from '../stripe/StripeProvider'
import { log } from '../config'
import Stripe from 'stripe'
import { MeterEventSummary } from '../stripe/types'

export class BillingService implements BillingProvider {
    public stripeClient: Stripe
    private stripeProvider: StripeProvider
    private langfuseProvider: LangfuseProvider

    constructor() {
        this.langfuseProvider = new LangfuseProvider()
        try {
            this.stripeProvider = new StripeProvider()
            this.stripeClient = new Stripe(process.env.BILLING_STRIPE_SECRET_KEY! ?? '', {
                apiVersion: '2025-02-24.acacia'
            })
        } catch (error) {
            log.error('Failed to initialize Stripe client', { error })
        }
    }

    async createCheckoutSession(params: CreateCheckoutSessionParams): Promise<CheckoutSession> {
        return this.stripeProvider.createCheckoutSession(params)
    }

    // Usage tracking methods using Langfuse
    async getUsageSummary(customerId: string): Promise<UsageStats> {
        const now = new Date()
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
        const startTime = Math.floor(startOfMonth.getTime() / 1000)
        const endTime = Math.floor(now.getTime() / 1000)
        // console.log('Getting usage summary for customer', customerId)
        const meters = await this.stripeClient.billing.meters.list()
        const summariesPromises = meters.data.map((meter) =>
            this.stripeClient.billing.meters.listEventSummaries(meter.id, {
                customer: customerId,
                start_time: startTime,
                end_time: endTime
            })
        )

        const summaries = await Promise.all(summariesPromises)
        // console.log('Summaries', summaries)
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
                const invoice = await this.stripeProvider.getUpcomingInvoice(invoiceParams)

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

    async syncLangfuseUsageToStripe(traceId?: string): Promise<{
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
            result = await this.langfuseProvider.syncUsageToStripe(traceId)
            const langfuseTime = Date.now() - langfuseStartTime
            log.info('Langfuse sync completed', { durationMs: langfuseTime, traceId })

            // Sync to Stripe if needed
            if (result.creditsData && result.creditsData.length > 0) {
                const stripeStartTime = Date.now()
                const stripeResult = await this.stripeProvider.syncUsageToStripe(result.creditsData)
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

    /**
     * Get detailed usage events from Langfuse
     */
    async getUsageEvents(params: GetUsageEventsParams): Promise<UsageEventsResponse> {
        try {
            return this.langfuseProvider.getUsageEvents(params)
        } catch (error) {
            log.error('Error getting usage events:', { error, customerId: params.customerId })
            throw error
        }
    }
}
