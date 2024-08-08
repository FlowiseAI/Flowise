import { prisma } from '@db/client'
import { User } from 'types'
import { createNewActiveUserPlan } from './createNewActiveUserPlan'
import { deactivateCurrentUserPlan } from './deactivateCurrentUserPlan'
import { getStripeClient } from '../stripe/getStripeClient'

export const getActiveUserPlan = async (user: User) => {
    let activeUserPlan = await prisma.activeUserPlan.findUnique({
        where: { userId: user.id },
        include: {
            plan: true
        }
    })

    if (!activeUserPlan) {
        activeUserPlan = await createNewActiveUserPlan({ user, planId: 1 })
    }

    if (activeUserPlan.renewalDate < new Date()) {
        if (activeUserPlan.plan.id === 1) {
            // if user is on the free plan, renew the plan
            await deactivateCurrentUserPlan(activeUserPlan)
            activeUserPlan = await createNewActiveUserPlan({ user, planId: 1 })
        } else {
            // if user is on a paid plan, check stripe to see if the subscription has renewed
            const stripe = getStripeClient()
            const stripeSubscriptionId = activeUserPlan.stripeSubscriptionId
            if (!stripeSubscriptionId) throw new Error('Stripe subscription id not found')
            const subscription = await stripe.subscriptions.retrieve(stripeSubscriptionId)

            const renewalDate = new Date(subscription.current_period_end * 1000)
            if (renewalDate > activeUserPlan.renewalDate) {
                // create a new active plan with latest renewal date
                await deactivateCurrentUserPlan(activeUserPlan)
                activeUserPlan = await createNewActiveUserPlan({
                    user,
                    planId: activeUserPlan.plan.id,
                    renewalDate,
                    stripeSubscriptionId
                })
            } else {
                // subscription did not renew (probably canceled)
                // downgrade to free plan
                await deactivateCurrentUserPlan(activeUserPlan)
                activeUserPlan = await createNewActiveUserPlan({ user, planId: 1 })
            }
        }
    }

    return activeUserPlan
}
