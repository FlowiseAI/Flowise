import { prisma } from '@db/client'
import { ActiveUserPlan } from 'db/generated/prisma-client'

export const updateActiveUserPlan = async (activeUserPlanId: string, fields: Partial<ActiveUserPlan>) => {
    return await prisma.activeUserPlan.update({
        where: { id: activeUserPlanId },
        data: fields
    })
}
