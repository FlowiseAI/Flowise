import { prisma } from '@db/client'
import { User } from 'types'

export const createNewActiveUserPlan = async ({
    user,
    planId,
    renewalDate,
    stripeSubscriptionId,
    additionalTokens = 0
}: {
    user: User
    planId: number
    renewalDate?: Date
    stripeSubscriptionId?: string
    additionalTokens?: number
}) => {
    if (!renewalDate) {
        renewalDate = new Date()
        renewalDate.setMonth(renewalDate.getMonth() + 1)
    }

    const plan = await prisma.plan.findUnique({
        where: {
            id: planId
        },
        select: {
            id: true,
            tokenLimit: true
        }
    })

    if (!plan) {
        throw new Error(`Plan with id ${planId} not found`)
    }

    const activeUserPlan = await prisma.activeUserPlan.create({
        data: {
            planId: plan.id,
            userId: user.id,
            renewalDate,
            tokensLeft: plan.tokenLimit + additionalTokens,
            stripeSubscriptionId
        },
        include: {
            plan: true
        }
    })

    return activeUserPlan
}
