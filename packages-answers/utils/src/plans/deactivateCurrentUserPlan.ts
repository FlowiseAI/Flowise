import { prisma } from '@db/client'
import { ActiveUserPlan } from 'db/generated/prisma-client'

export const deactivateCurrentUserPlan = async (activeUserPlan: ActiveUserPlan) => {
    // archive the current active plan
    await prisma.userPlanHistory.create({
        data: {
            planId: activeUserPlan.planId,
            userId: activeUserPlan.userId,
            renewalDate: activeUserPlan.renewalDate,
            tokensLeft: 0,
            gpt3RequestCount: activeUserPlan.gpt3RequestCount,
            gpt4RequestCount: activeUserPlan.gpt4RequestCount,
            startDate: activeUserPlan.startDate,
            endDate: new Date()
        }
    })

    // delete current active plan
    await prisma.activeUserPlan.delete({
        where: {
            id: activeUserPlan.id
        }
    })

    return { planId: activeUserPlan.planId, tokensLeft: activeUserPlan.tokensLeft }
}
