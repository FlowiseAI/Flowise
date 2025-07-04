import Stripe from 'stripe'
import { DataSource } from 'typeorm'
import { User } from '../../database/entities/User'
import { Organization } from '../../database/entities/Organization'

export const ensureStripeCustomerForUser = async (
    AppDataSource: DataSource,
    user: User,
    organization: Organization,
    auth0Id: string,
    email: string,
    name: string
): Promise<User> => {
    let stripeCustomerId = user.stripeCustomerId
    if (!stripeCustomerId && process.env.BILLING_STRIPE_SECRET_KEY) {
        if (
            process.env.BILLING_STRIPE_ORGANIZATION_CUSTOMER_ID ||
            (organization.stripeCustomerId && organization.billingPoolEnabled == true)
        ) {
            stripeCustomerId = process.env.BILLING_STRIPE_ORGANIZATION_CUSTOMER_ID ?? organization.stripeCustomerId!
        } else {
            try {
                const stripe = new Stripe(process.env.BILLING_STRIPE_SECRET_KEY ?? '')

                const existingCustomer = await stripe.customers.list({
                    email,
                    limit: 1
                })

                if (existingCustomer.data.length > 0) {
                    stripeCustomerId = existingCustomer.data[0].id
                } else {
                    const customer = await stripe.customers.create(
                        {
                            email,
                            name,
                            metadata: {
                                userId: user.id,
                                auth0Id,
                                orgId: organization.id
                            }
                        },
                        { idempotencyKey: auth0Id }
                    )
                    stripeCustomerId = customer.id
                }
                // Optionally, update the user profile in your database with the new customerId
                user.stripeCustomerId = stripeCustomerId
            } catch (error) {
                console.error('Error creating/updating Stripe customers:', error)
                throw new Error('Internal Server Error')
            }
            await AppDataSource.getRepository(User).save(user)
        }
        user.stripeCustomerId = stripeCustomerId
    }
    return user
}
