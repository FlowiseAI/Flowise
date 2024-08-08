import { Stripe } from 'stripe'

let stripeClient: Stripe | null = null

export const getStripeClient = () => {
    if (!stripeClient) {
        stripeClient = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
            apiVersion: '2022-11-15'
        })
    }

    return stripeClient
}
