import { User } from 'types'
import { getActiveUserPlan } from './getActiveUserPlan'
import { deactivateCurrentUserPlan } from './deactivateCurrentUserPlan'
import { createNewActiveUserPlan } from './createNewActiveUserPlan'

export const subscribeToUserPlan = async ({
    user,
    planId,
    renewalDate,
    stripeSubscriptionId
}: {
    user: User
    planId: number
    renewalDate: Date
    stripeSubscriptionId: string
}) => {
    const activeUserPlan = await getActiveUserPlan(user)
    const { planId: oldPlanId, tokensLeft } = await deactivateCurrentUserPlan(activeUserPlan)

    const newUserPlan = await createNewActiveUserPlan({
        user,
        planId,
        renewalDate,
        stripeSubscriptionId,
        additionalTokens: planId > oldPlanId ? tokensLeft : 0
    })
    return newUserPlan
}
