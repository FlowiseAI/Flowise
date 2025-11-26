import Stripe from 'stripe'
import { Request } from 'express'
import { UsageCacheManager } from './UsageCacheManager'
import { UserPlan } from './Interface'
import { LICENSE_QUOTAS } from './utils/constants'

export class StripeManager {
    private static instance: StripeManager
    private stripe?: Stripe
    private cacheManager: UsageCacheManager

    public static async getInstance(): Promise<StripeManager> {
        if (!StripeManager.instance) {
            StripeManager.instance = new StripeManager()
            await StripeManager.instance.initialize()
        }
        return StripeManager.instance
    }

    private async initialize() {
        if (!this.stripe && process.env.STRIPE_SECRET_KEY) {
            this.stripe = new Stripe(process.env.STRIPE_SECRET_KEY)
        }
        this.cacheManager = await UsageCacheManager.getInstance()
    }

    public getStripe() {
        if (!this.stripe) throw new Error('Stripe is not initialized')
        return this.stripe
    }

    public getSubscriptionObject(subscription: Stripe.Response<Stripe.Subscription>) {
        return {
            customer: subscription.customer,
            status: subscription.status,
            created: subscription.created
        }
    }

    public async getProductIdFromSubscription(subscriptionId: string) {
        if (!subscriptionId || subscriptionId.trim() === '') {
            return ''
        }

        if (!this.stripe) {
            throw new Error('Stripe is not initialized')
        }

        const subscriptionData = await this.cacheManager.getSubscriptionDataFromCache(subscriptionId)
        if (subscriptionData?.productId) {
            return subscriptionData.productId
        }

        try {
            const subscription = await this.stripe.subscriptions.retrieve(subscriptionId)
            const items = subscription.items.data
            if (items.length === 0) {
                return ''
            }

            const productId = items[0].price.product as string
            await this.cacheManager.updateSubscriptionDataToCache(subscriptionId, {
                productId,
                subsriptionDetails: this.getSubscriptionObject(subscription)
            })

            return productId
        } catch (error) {
            return ''
        }
    }

    public async getFeaturesByPlan(subscriptionId: string, withoutCache: boolean = false) {
        if (!this.stripe || !subscriptionId) {
            return {}
        }

        if (!withoutCache) {
            const subscriptionData = await this.cacheManager.getSubscriptionDataFromCache(subscriptionId)
            if (subscriptionData?.features) {
                return subscriptionData.features
            }
        }

        const subscription = await this.stripe.subscriptions.retrieve(subscriptionId, {
            timeout: 5000
        })
        const items = subscription.items.data
        if (items.length === 0) {
            return {}
        }

        const productId = items[0].price.product as string
        const product = await this.stripe.products.retrieve(productId, {
            timeout: 5000
        })
        const productMetadata = product.metadata

        if (!productMetadata || Object.keys(productMetadata).length === 0) {
            return {}
        }

        const features: Record<string, string> = {}
        for (const key in productMetadata) {
            if (key.startsWith('feat:')) {
                features[key] = productMetadata[key]
            }
        }

        await this.cacheManager.updateSubscriptionDataToCache(subscriptionId, {
            features,
            subsriptionDetails: this.getSubscriptionObject(subscription)
        })

        return features
    }

    public async createStripeCustomerPortalSession(req: Request) {
        if (!this.stripe) {
            throw new Error('Stripe is not initialized')
        }

        const customerId = req.user?.activeOrganizationCustomerId
        if (!customerId) {
            throw new Error('Customer ID is required')
        }

        const subscriptionId = req.user?.activeOrganizationSubscriptionId
        if (!subscriptionId) {
            throw new Error('Subscription ID is required')
        }

        try {
            const prodPriceIds = await this.getPriceIds()
            const configuration = await this.createPortalConfiguration(prodPriceIds)

            const portalSession = await this.stripe.billingPortal.sessions.create({
                customer: customerId,
                configuration: configuration.id,
                return_url: `${process.env.APP_URL}/account`
                /* We can't have flow_data because it does not support multiple subscription items
                flow_data: {
                    type: 'subscription_update',
                    subscription_update: {
                        subscription: subscriptionId
                    },
                    after_completion: {
                        type: 'redirect',
                        redirect: {
                            return_url: `${process.env.APP_URL}/account/subscription?subscriptionId=${subscriptionId}`
                        }
                    }
                }*/
            })

            return { url: portalSession.url }
        } catch (error) {
            console.error('Error creating customer portal session:', error)
            throw error
        }
    }

    private async getPriceIds() {
        const prodPriceIds: Record<string, { product: string; price: string }> = {
            [UserPlan.STARTER]: {
                product: process.env.CLOUD_STARTER_ID as string,
                price: ''
            },
            [UserPlan.PRO]: {
                product: process.env.CLOUD_PRO_ID as string,
                price: ''
            },
            [UserPlan.FREE]: {
                product: process.env.CLOUD_FREE_ID as string,
                price: ''
            },
            SEAT: {
                product: process.env.ADDITIONAL_SEAT_ID as string,
                price: ''
            }
        }

        for (const key in prodPriceIds) {
            const prices = await this.stripe!.prices.list({
                product: prodPriceIds[key].product,
                active: true,
                limit: 1
            })

            if (prices.data.length) {
                prodPriceIds[key].price = prices.data[0].id
            }
        }

        return prodPriceIds
    }

    private async createPortalConfiguration(_: Record<string, { product: string; price: string }>) {
        return await this.stripe!.billingPortal.configurations.create({
            business_profile: {
                privacy_policy_url: `${process.env.APP_URL}/privacy-policy`,
                terms_of_service_url: `${process.env.APP_URL}/terms-of-service`
            },
            features: {
                invoice_history: {
                    enabled: true
                },
                payment_method_update: {
                    enabled: true
                },
                subscription_cancel: {
                    enabled: false
                }
                /*subscription_update: {
                    enabled: false,
                    default_allowed_updates: ['price'],
                    products: [
                        {
                            product: prodPriceIds[UserPlan.FREE].product,
                            prices: [prodPriceIds[UserPlan.FREE].price]
                        },
                        {
                            product: prodPriceIds[UserPlan.STARTER].product,
                            prices: [prodPriceIds[UserPlan.STARTER].price]
                        },
                        {
                            product: prodPriceIds[UserPlan.PRO].product,
                            prices: [prodPriceIds[UserPlan.PRO].price]
                        }
                    ],
                    proration_behavior: 'always_invoice'
                }*/
            }
        })
    }

    public async getAdditionalSeatsQuantity(subscriptionId: string): Promise<{ quantity: number; includedSeats: number }> {
        if (!this.stripe) {
            throw new Error('Stripe is not initialized')
        }

        try {
            const subscription = await this.stripe.subscriptions.retrieve(subscriptionId)
            const additionalSeatsItem = subscription.items.data.find(
                (item) => (item.price.product as string) === process.env.ADDITIONAL_SEAT_ID
            )
            const quotas = await this.cacheManager.getQuotas(subscriptionId)

            return { quantity: additionalSeatsItem?.quantity || 0, includedSeats: quotas[LICENSE_QUOTAS.USERS_LIMIT] }
        } catch (error) {
            console.error('Error getting additional seats quantity:', error)
            throw error
        }
    }

    public async getCustomerWithDefaultSource(customerId: string) {
        if (!this.stripe) {
            throw new Error('Stripe is not initialized')
        }

        try {
            const customer = (await this.stripe.customers.retrieve(customerId, {
                expand: ['default_source', 'invoice_settings.default_payment_method']
            })) as Stripe.Customer

            return customer
        } catch (error) {
            console.error('Error retrieving customer with default source:', error)
            throw error
        }
    }

    public async getAdditionalSeatsProration(subscriptionId: string, quantity: number) {
        if (!this.stripe) {
            throw new Error('Stripe is not initialized')
        }

        try {
            const subscription = await this.stripe.subscriptions.retrieve(subscriptionId)

            // Get customer's credit balance
            const customer = await this.stripe.customers.retrieve(subscription.customer as string)
            const creditBalance = (customer as Stripe.Customer).balance // Balance is in cents, negative for credit, positive for amount owed

            // Get the current subscription's base price (without seats)
            const basePlanItem = subscription.items.data.find((item) => (item.price.product as string) !== process.env.ADDITIONAL_SEAT_ID)
            const basePlanAmount = basePlanItem ? basePlanItem.price.unit_amount! * 1 : 0

            const existingInvoice = await this.stripe.invoices.retrieveUpcoming({
                customer: subscription.customer as string,
                subscription: subscriptionId
            })

            const existingInvoiceTotal = existingInvoice.total

            // Get the price ID for additional seats
            const prices = await this.stripe.prices.list({
                product: process.env.ADDITIONAL_SEAT_ID,
                active: true,
                limit: 1
            })

            if (prices.data.length === 0) {
                throw new Error('No active price found for additional seats')
            }

            const seatPrice = prices.data[0]
            const pricePerSeat = seatPrice.unit_amount || 0

            // Use current timestamp for proration calculation
            const prorationDate = Math.floor(Date.now() / 1000)

            const additionalSeatsItem = subscription.items.data.find(
                (item) => (item.price.product as string) === process.env.ADDITIONAL_SEAT_ID
            )

            const upcomingInvoice = await this.stripe.invoices.retrieveUpcoming({
                customer: subscription.customer as string,
                subscription: subscriptionId,
                subscription_details: {
                    proration_behavior: 'always_invoice',
                    proration_date: prorationDate,
                    items: [
                        additionalSeatsItem
                            ? {
                                  id: additionalSeatsItem.id,
                                  quantity: quantity
                              }
                            : {
                                  // If the item doesn't exist yet, create a new one
                                  // This will be used to calculate the proration amount
                                  price: prices.data[0].id,
                                  quantity: quantity
                              }
                    ]
                }
            })

            // Calculate proration amount from the relevant line items
            // Only consider prorations that match our proration date
            const prorationLineItems = upcomingInvoice.lines.data.filter(
                (line) => line.type === 'invoiceitem' && line.period.start === prorationDate
            )

            const prorationAmount = prorationLineItems.reduce((total, item) => total + item.amount, 0)

            return {
                basePlanAmount: basePlanAmount / 100,
                additionalSeatsProratedAmount: (existingInvoiceTotal + prorationAmount - basePlanAmount) / 100,
                seatPerUnitPrice: pricePerSeat / 100,
                prorationAmount: prorationAmount / 100,
                creditBalance: creditBalance / 100,
                nextInvoiceTotal: (existingInvoiceTotal + prorationAmount) / 100,
                currency: upcomingInvoice.currency.toUpperCase(),
                prorationDate,
                currentPeriodStart: subscription.current_period_start,
                currentPeriodEnd: subscription.current_period_end
            }
        } catch (error) {
            console.error('Error calculating additional seats proration:', error)
            throw error
        }
    }

    public async updateAdditionalSeats(subscriptionId: string, quantity: number, prorationDate: number) {
        if (!this.stripe) {
            throw new Error('Stripe is not initialized')
        }

        try {
            const subscription = await this.stripe.subscriptions.retrieve(subscriptionId)
            const additionalSeatsItem = subscription.items.data.find(
                (item) => (item.price.product as string) === process.env.ADDITIONAL_SEAT_ID
            )

            // Get the price ID for additional seats if needed
            const prices = await this.stripe.prices.list({
                product: process.env.ADDITIONAL_SEAT_ID,
                active: true,
                limit: 1
            })

            if (prices.data.length === 0) {
                throw new Error('No active price found for additional seats')
            }

            // Create an invoice immediately for the proration
            const updatedSubscription = await this.stripe.subscriptions.update(subscriptionId, {
                items: [
                    additionalSeatsItem
                        ? {
                              id: additionalSeatsItem.id,
                              quantity: quantity
                          }
                        : {
                              price: prices.data[0].id,
                              quantity: quantity
                          }
                ],
                proration_behavior: 'always_invoice',
                proration_date: prorationDate
            })

            // Get the latest invoice for this subscription
            const invoice = await this.stripe.invoices.list({
                subscription: subscriptionId,
                limit: 1
            })

            if (invoice.data.length > 0) {
                const latestInvoice = invoice.data[0]
                // Only try to pay if the invoice is not already paid
                if (latestInvoice.status !== 'paid') {
                    await this.stripe.invoices.pay(latestInvoice.id)
                }
            }

            return {
                success: true,
                subscription: updatedSubscription,
                invoice: invoice.data[0]
            }
        } catch (error) {
            console.error('Error updating additional seats:', error)
            throw error
        }
    }

    public async getPlanProration(subscriptionId: string, newPlanId: string) {
        if (!this.stripe) {
            throw new Error('Stripe is not initialized')
        }

        try {
            const subscription = await this.stripe.subscriptions.retrieve(subscriptionId)
            const customerId = subscription.customer as string

            // Get customer's credit balance and metadata
            const customer = await this.stripe.customers.retrieve(customerId)
            const creditBalance = (customer as Stripe.Customer).balance
            const customerMetadata = (customer as Stripe.Customer).metadata || {}

            // Get the price ID for the new plan
            const prices = await this.stripe.prices.list({
                product: newPlanId,
                active: true,
                limit: 1
            })

            if (prices.data.length === 0) {
                throw new Error('No active price found for the selected plan')
            }

            const newPlan = prices.data[0]
            const newPlanPrice = newPlan.unit_amount || 0

            // Check if this is the STARTER plan and eligible for first month free
            const isStarterPlan = newPlanId === process.env.CLOUD_STARTER_ID
            const hasUsedFirstMonthFreeCoupon = customerMetadata.has_used_first_month_free === 'true'
            const eligibleForFirstMonthFree = isStarterPlan && !hasUsedFirstMonthFreeCoupon

            // Use current timestamp for proration calculation
            const prorationDate = Math.floor(Date.now() / 1000)

            const upcomingInvoice = await this.stripe.invoices.retrieveUpcoming({
                customer: customerId,
                subscription: subscriptionId,
                subscription_details: {
                    proration_behavior: 'always_invoice',
                    proration_date: prorationDate,
                    items: [
                        {
                            id: subscription.items.data[0].id,
                            price: newPlan.id
                        }
                    ]
                }
            })

            let prorationAmount = upcomingInvoice.lines.data.reduce((total, item) => total + item.amount, 0)
            if (eligibleForFirstMonthFree) {
                prorationAmount = 0
            }

            return {
                newPlanAmount: newPlanPrice / 100,
                prorationAmount: prorationAmount / 100,
                creditBalance: creditBalance / 100,
                currency: upcomingInvoice.currency.toUpperCase(),
                prorationDate,
                currentPeriodStart: subscription.current_period_start,
                currentPeriodEnd: subscription.current_period_end,
                eligibleForFirstMonthFree
            }
        } catch (error) {
            console.error('Error calculating plan proration:', error)
            throw error
        }
    }

    public async updateSubscriptionPlan(subscriptionId: string, newPlanId: string, prorationDate: number) {
        if (!this.stripe) {
            throw new Error('Stripe is not initialized')
        }

        try {
            const subscription = await this.stripe.subscriptions.retrieve(subscriptionId)
            const customerId = subscription.customer as string

            // Get customer details and metadata
            const customer = await this.stripe.customers.retrieve(customerId)
            const customerMetadata = (customer as Stripe.Customer).metadata || {}

            // Get the price ID for the new plan
            const prices = await this.stripe.prices.list({
                product: newPlanId,
                active: true,
                limit: 1
            })

            if (prices.data.length === 0) {
                throw new Error('No active price found for the selected plan')
            }

            const newPlan = prices.data[0]
            let updatedSubscription: Stripe.Response<Stripe.Subscription>

            // Check if this is an upgrade to CLOUD_STARTER_ID and eligible for first month free
            const isStarterPlan = newPlanId === process.env.CLOUD_STARTER_ID
            const hasUsedFirstMonthFreeCoupon = customerMetadata.has_used_first_month_free === 'true'

            if (isStarterPlan && !hasUsedFirstMonthFreeCoupon) {
                // Create the one-time 100% off coupon
                const coupon = await this.stripe.coupons.create({
                    duration: 'once',
                    percent_off: 100,
                    max_redemptions: 1,
                    metadata: {
                        type: 'first_month_free',
                        customer_id: customerId,
                        plan_id: process.env.CLOUD_STARTER_ID || ''
                    }
                })

                // Create a promotion code linked to the coupon
                const promotionCode = await this.stripe.promotionCodes.create({
                    coupon: coupon.id,
                    max_redemptions: 1
                })

                // Update the subscription with the new plan and apply the promotion code
                updatedSubscription = await this.stripe.subscriptions.update(subscriptionId, {
                    items: [
                        {
                            id: subscription.items.data[0].id,
                            price: newPlan.id
                        }
                    ],
                    proration_behavior: 'always_invoice',
                    proration_date: prorationDate,
                    promotion_code: promotionCode.id
                })

                // Update customer metadata to mark the coupon as used
                await this.stripe.customers.update(customerId, {
                    metadata: {
                        ...customerMetadata,
                        has_used_first_month_free: 'true',
                        first_month_free_date: new Date().toISOString()
                    }
                })
            } else {
                // Regular plan update without coupon
                updatedSubscription = await this.stripe.subscriptions.update(subscriptionId, {
                    items: [
                        {
                            id: subscription.items.data[0].id,
                            price: newPlan.id
                        }
                    ],
                    proration_behavior: 'always_invoice',
                    proration_date: prorationDate
                })
            }

            // Get and pay the latest invoice
            const invoice = await this.stripe.invoices.list({
                subscription: subscriptionId,
                limit: 1
            })

            if (invoice.data.length > 0) {
                const latestInvoice = invoice.data[0]
                if (latestInvoice.status !== 'paid') {
                    await this.stripe.invoices.pay(latestInvoice.id)
                }
            }

            return {
                success: true,
                subscription: updatedSubscription,
                invoice: invoice.data[0]
            }
        } catch (error) {
            console.error('Error updating subscription plan:', error)
            throw error
        }
    }
}
