import Stripe from 'stripe'

import { CreateCheckoutSessionParams, GetUpcomingInvoiceParams, CheckoutSession, Invoice, CreditsData } from '../core/types'
import { log, BILLING_CONFIG } from '../config'
import { langfuse } from '../config'
// import { UserCredits } from '../../../database/entities/UserCredits'

export class StripeProvider {
    stripeClient: Stripe
    constructor() {
        this.stripeClient = new Stripe(process.env.BILLING_STRIPE_SECRET_KEY! ?? '')
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

                        const meterId = metersMap.get('credits')
                        if (!meterId) {
                            throw new Error('No meter found for type: credits')
                        }

                        let retryCount = 0

                        while (retryCount < BILLING_CONFIG.VALIDATION.MAX_RETRIES) {
                            try {
                                const stripeMeterEvent = {
                                    event_name: 'credits',
                                    identifier: `${data.traceId}_credits`,
                                    timestamp,
                                    payload: {
                                        value: totalCredits.toString(),
                                        stripe_customer_id: data.stripeCustomerId,
                                        user_id: data.userId,
                                        trace_id: data.traceId,
                                        ai_tokens_credits: aiTokens.toString(),
                                        compute_credits: data.credits.compute.toString(),
                                        ai_tokens_cost: (data.costs.base.ai + (data.costs.base.unknown || 0)).toFixed(6),
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

    private async updateTraceMetadata(
        data: CreditsData & { fullTrace: any },
        result: Stripe.Billing.MeterEvent,
        batchStartTime: number,
        batchSize: number,
        batchIndex: number,
        meterId: string
    ): Promise<void> {
        const totalCredits = data.credits.ai_tokens + data.credits.compute + data.credits.storage

        await langfuse.trace({
            id: data.traceId,
            timestamp: data.fullTrace?.timestamp,
            metadata: {
                ...data.fullTrace?.metadata,
                billing_status: 'processed',
                meter_event_id: result.identifier,
                billing_details: {
                    total_credits: totalCredits,
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
}
