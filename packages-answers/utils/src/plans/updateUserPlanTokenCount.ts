import { User } from 'types'
import { prisma } from '@db/client'
import { getActiveUserPlan } from './getActiveUserPlan'

export const updateUserPlanTokenCount = async (user: User, tokensUsed: number, model: string) => {
    const activeUserPlan = await getActiveUserPlan(user)
    const mutiplier = model.startsWith('gpt-4') ? 10 : 1
    const newTokenCount = activeUserPlan.tokensLeft - tokensUsed * mutiplier
    const gpt3RequestCount = activeUserPlan.gpt3RequestCount + (!model.startsWith('gpt-4') ? 1 : 0)
    const gpt4RequestCount = activeUserPlan.gpt4RequestCount + (model.startsWith('gpt-4') ? 1 : 0)
    await prisma.activeUserPlan.update({
        where: {
            id: activeUserPlan.id
        },
        data: {
            tokensLeft: newTokenCount < 0 ? 0 : newTokenCount,
            gpt3RequestCount,
            gpt4RequestCount
        }
    })
}
