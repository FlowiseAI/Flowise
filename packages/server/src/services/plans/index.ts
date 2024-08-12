import { Organization } from '../../database/entities/Organization'
import { User } from '../../database/entities/User'
import { TrialPlan } from '../../database/entities/TrialPlan'
import { InternalFlowiseError } from '../../errors/internalFlowiseError'
import { StatusCodes } from 'http-status-codes'
import { getRunningExpressApp } from '../../utils/getRunningExpressApp'
import { PaidPlan } from '../../database/entities/PaidPlan'
import { MoreThan } from 'typeorm'

const DEFAULT_AVAILABLE_EXECUTIONS = 200

async function getCurrentPlan(userId: string, orgId: string): Promise<PaidPlan | TrialPlan | null> {
    try {
        const appServer = getRunningExpressApp()
        const org = await appServer.AppDataSource.getRepository(Organization).findOneBy({
            id: orgId
        })
        if (!org) {
            throw new InternalFlowiseError(StatusCodes.NOT_FOUND, `Organization ${orgId} not found`)
        }

        return org.name === 'public' ? getOrCreateTrialPlanForUser(userId) : getPaidPlanForOrg(orgId)
    } catch (error) {
        console.error('Error in getCurrentPlan:', error)
        if (error instanceof InternalFlowiseError) {
            throw error
        }

        throw new InternalFlowiseError(StatusCodes.INTERNAL_SERVER_ERROR, 'Error getting current plan')
    }
}

async function checkForAvailableExecutions(userId: string, orgId: string): Promise<void> {
    try {
        const appServer = getRunningExpressApp()
        const org = await appServer.AppDataSource.getRepository(Organization).findOneBy({
            id: orgId
        })
        if (!org) {
            throw new InternalFlowiseError(StatusCodes.NOT_FOUND, `Organization ${orgId} not found`)
        }
        const currentPlan = await getCurrentPlan(userId, orgId)

        if (!currentPlan || currentPlan.availableExecutions <= currentPlan.usedExecutions) {
            throw new InternalFlowiseError(
                StatusCodes.PAYMENT_REQUIRED,
                'Insufficient executions. Please purchase more to continue using this service.'
            )
        }
    } catch (error) {
        console.error('Error in checkForAvailableExecutions:', error)
        if (error instanceof InternalFlowiseError) {
            throw error
        }

        throw new InternalFlowiseError(StatusCodes.INTERNAL_SERVER_ERROR, 'Error checking available executions')
    }
}

async function getOrCreateTrialPlanForUser(userId: string): Promise<TrialPlan> {
    try {
        const appServer = getRunningExpressApp()
        const user = await appServer.AppDataSource.getRepository(User).findOneBy({
            id: userId
        })
        if (!user) {
            throw new InternalFlowiseError(StatusCodes.NOT_FOUND, `User ${userId} not found`)
        }
        let trialPlan: TrialPlan | null = null
        if (user.trialPlanId) {
            trialPlan = await appServer.AppDataSource.getRepository(TrialPlan).findOneBy({
                id: user.trialPlanId
            })
            if (!trialPlan) {
                throw new InternalFlowiseError(StatusCodes.NOT_FOUND, `Trial plan ${user.trialPlanId} not found`)
            }
        } else {
            trialPlan = new TrialPlan()
            trialPlan.availableExecutions = DEFAULT_AVAILABLE_EXECUTIONS
            trialPlan.usedExecutions = 0
            await appServer.AppDataSource.getRepository(TrialPlan).save(trialPlan)
            user.trialPlanId = trialPlan.id
            await appServer.AppDataSource.getRepository(User).save(user)
        }
        return trialPlan
    } catch (error) {
        console.error('Error in getOrCreateTrialPlanForUser:', error)
        if (error instanceof InternalFlowiseError) {
            throw error
        }

        throw new InternalFlowiseError(StatusCodes.INTERNAL_SERVER_ERROR, 'Error getting or creating trial plan')
    }
}

async function getPaidPlanForOrg(orgId: string): Promise<PaidPlan | null> {
    try {
        const appServer = getRunningExpressApp()
        const org = await appServer.AppDataSource.getRepository(Organization).findOneBy({
            id: orgId
        })
        if (!org) {
            throw new InternalFlowiseError(StatusCodes.NOT_FOUND, `Organization ${orgId} not found`)
        }
        if (!org.currentPaidPlanId) {
            return null
        }
        let paidPlan = await appServer.AppDataSource.getRepository(PaidPlan).findOneBy({
            id: org.currentPaidPlanId
        })
        if (!paidPlan) {
            throw new InternalFlowiseError(StatusCodes.NOT_FOUND, `Paid plan ${org.currentPaidPlanId} not found`)
        }
        while (paidPlan!.availableExecutions <= paidPlan!.usedExecutions) {
            const nextPaidPlans: PaidPlan[] = await appServer.AppDataSource.getRepository(PaidPlan).find({
                where: {
                    organizationId: org.id,
                    createdDate: MoreThan(paidPlan.createdDate)
                },
                order: {
                    createdDate: 'ASC'
                },
                take: 1
            })
            if (nextPaidPlans.length > 0) {
                paidPlan = nextPaidPlans[0]
                org.currentPaidPlanId = paidPlan.id
            } else {
                org.currentPaidPlanId = undefined
                await appServer.AppDataSource.getRepository(Organization).save(org)
                return null
            }
        }
        await appServer.AppDataSource.getRepository(Organization).save(org)
        return paidPlan
    } catch (error) {
        console.error('Error in getPaidPlanForOrg:', error)
        if (error instanceof InternalFlowiseError) {
            throw error
        }

        throw new InternalFlowiseError(StatusCodes.INTERNAL_SERVER_ERROR, 'Error getting paid plan for organization')
    }
}

async function incrementUsedExecutionCount(userId: string, orgId: string): Promise<void> {
    try {
        const appServer = getRunningExpressApp()
        const org = await appServer.AppDataSource.getRepository(Organization).findOneBy({
            id: orgId
        })
        if (!org) {
            throw new InternalFlowiseError(StatusCodes.NOT_FOUND, `Organization ${orgId} not found`)
        }
        if (org.name === 'public') {
            const trialPlan = await getOrCreateTrialPlanForUser(userId)
            trialPlan.usedExecutions++
            await appServer.AppDataSource.getRepository(TrialPlan).save(trialPlan)
        } else {
            const paidPlan = await getPaidPlanForOrg(orgId)
            if (!paidPlan) {
                throw new InternalFlowiseError(StatusCodes.NOT_FOUND, 'Paid plan not found')
            }
            paidPlan.usedExecutions++
            await appServer.AppDataSource.getRepository(PaidPlan).save(paidPlan)
        }
    } catch (error) {
        console.error('Error in logExecution:', error)
        if (error instanceof InternalFlowiseError) {
            throw error
        }

        throw new InternalFlowiseError(StatusCodes.INTERNAL_SERVER_ERROR, 'Error logging execution')
    }
}

async function getPlanHistory(orgId: string): Promise<PaidPlan[]> {
    try {
        const appServer = getRunningExpressApp()
        const org = await appServer.AppDataSource.getRepository(Organization).findOneBy({
            id: orgId
        })
        if (!org) {
            throw new InternalFlowiseError(StatusCodes.NOT_FOUND, `Organization ${orgId} not found`)
        }
        if (org.name === 'public') {
            return []
        }
        const paidPlans = await appServer.AppDataSource.getRepository(PaidPlan).find({
            where: {
                organizationId: org.id
            },
            order: {
                createdDate: 'DESC'
            }
        })
        return paidPlans
    } catch (error) {
        console.error('Error in getPlanHistoryForOrg:', error)
        if (error instanceof InternalFlowiseError) {
            throw error
        }

        throw new InternalFlowiseError(StatusCodes.INTERNAL_SERVER_ERROR, 'Error getting plan history')
    }
}

export default {
    getCurrentPlan,
    checkForAvailableExecutions,
    getPaidPlanForOrg: getPaidPlanForOrg,
    getOrCreateTrialPlanForUser,
    incrementUsedExecutionCount,
    getPlanHistory
}
