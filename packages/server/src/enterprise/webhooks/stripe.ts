import { Request, Response } from 'express'
import Stripe from 'stripe'
import { StripeManager } from '../../StripeManager'
import { getRunningExpressApp } from '../../utils/getRunningExpressApp'
import logger from '../../utils/logger'
import { StripeService } from '../services/stripe.service'

export class StripeWebhooks {
    private stripe: Stripe

    public handler = async (req: Request, res: Response) => {
        const stripeManager = await StripeManager.getInstance()
        this.stripe = stripeManager.getStripe()

        let queryRunner
        try {
            queryRunner = getRunningExpressApp().AppDataSource.createQueryRunner()
            await queryRunner.connect()

            const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET

            if (!endpointSecret) {
                return res.status(400).json({ error: 'Webhook secret not configured' })
            }

            const sig = req.headers['stripe-signature']
            let event: Stripe.Event

            try {
                event = this.stripe.webhooks.constructEvent(req.body, sig as string, endpointSecret)
            } catch (err) {
                logger.error(`Webhook signature verification failed: ${err}`)
                return res.status(400).json({ error: 'Invalid signature' })
            }

            switch (event.type) {
                case 'invoice.paid': {
                    const stripeService = new StripeService()
                    await stripeService.reactivateOrganizationIfEligible(event.data.object as Stripe.Invoice, queryRunner)
                    break
                }

                case 'invoice.marked_uncollectible': {
                    const stripeService = new StripeService()
                    await stripeService.handleInvoiceMarkedUncollectible(event.data.object as Stripe.Invoice, queryRunner)
                    break
                }
            }

            res.status(200).json({ received: true })
        } catch (error) {
            if (queryRunner && queryRunner.isTransactionActive) await queryRunner.rollbackTransaction()
        } finally {
            if (queryRunner) await queryRunner.release()
        }
    }
}
