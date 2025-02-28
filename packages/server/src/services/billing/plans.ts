import { Organization } from '../../database/entities/Organization'
import { User } from '../../database/entities/User'
import { TrialPlan } from '../../database/entities/TrialPlan'
import { PaidPlan } from '../../database/entities/PaidPlan'
import { IUser } from '../../Interface'
import { InternalFlowiseError } from '../../errors/internalFlowiseError'
import { StatusCodes } from 'http-status-codes'
import { getRunningExpressApp } from '../../utils/getRunningExpressApp'
import { MoreThan } from 'typeorm'
import { v4 as uuidv4 } from 'uuid'

const DEFAULT_AVAILABLE_EXECUTIONS = Number(process.env.TRIAL_PLAN_EXECUTIONS)
const PUBLIC_ORG_ID = process.env.PUBLIC_ORG_ID!

async function getCurrentPlan(userId: string, orgId: string): Promise<PaidPlan | TrialPlan | null> {
    try {
        const appServer = getRunningExpressApp()
        const org = await appServer.AppDataSource.getRepository(Organization).findOneBy({
            id: orgId
        })
        if (!org) {
            throw new InternalFlowiseError(StatusCodes.NOT_FOUND, `Organization ${orgId} not found`)
        }
        return org.auth0Id === PUBLIC_ORG_ID ? getOrCreateTrialPlanForUser(userId) : getPaidPlanForOrg(orgId)
    } catch (error) {
        console.error('Error in getCurrentPlan:', error)
        if (error instanceof InternalFlowiseError) {
            throw error
        }
        throw new InternalFlowiseError(StatusCodes.INTERNAL_SERVER_ERROR, 'Error getting current plan')
    }
}

async function hasAvailableExecutions(userId: string, orgId: string): Promise<boolean> {
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
            return false
        }
        return true
    } catch (error) {
        if (error instanceof InternalFlowiseError) {
            throw error
        }
        throw new InternalFlowiseError(StatusCodes.INTERNAL_SERVER_ERROR, 'Error checking available executions')
    }
}

async function getOrCreateTrialPlanForUser(userId: string): Promise<TrialPlan> {
    try {
        const appServer = getRunningExpressApp()
        return await appServer.AppDataSource.transaction(async (transactionalEntityManager) => {
            const user = await transactionalEntityManager.findOne(User, {
                where: { id: userId },
                lock: { mode: 'pessimistic_write' }
            })

            if (!user) {
                throw new InternalFlowiseError(StatusCodes.NOT_FOUND, `User ${userId} not found`)
            }

            if (user.trialPlanId) {
                const trialPlan = await transactionalEntityManager.findOne(TrialPlan, {
                    where: { id: user.trialPlanId }
                })
                if (!trialPlan) {
                    throw new InternalFlowiseError(StatusCodes.NOT_FOUND, `Trial plan ${user.trialPlanId} not found`)
                }
                return trialPlan
            } else {
                const newTrialPlan = new TrialPlan()
                Object.assign(newTrialPlan, {
                    id: uuidv4(),
                    availableExecutions: DEFAULT_AVAILABLE_EXECUTIONS,
                    usedExecutions: 0,
                    userId: user.id
                })
                const trialPlan = await transactionalEntityManager.save(TrialPlan, newTrialPlan)
                user.trialPlanId = trialPlan.id
                await transactionalEntityManager.save(User, user)
                return trialPlan
            }
        })
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
        if (org.auth0Id === PUBLIC_ORG_ID) {
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

async function getPlanHistory(user: IUser): Promise<(PaidPlan | TrialPlan)[]> {
    try {
        const orgId = user.organizationId
        const appServer = getRunningExpressApp()
        const org = await appServer.AppDataSource.getRepository(Organization).findOneBy({
            id: orgId
        })
        if (!org) {
            throw new InternalFlowiseError(StatusCodes.NOT_FOUND, `Organization ${orgId} not found`)
        }
        if (org.auth0Id === PUBLIC_ORG_ID) {
            const trialPlan = await appServer.AppDataSource.getRepository(TrialPlan).findOne({
                where: { userId: user.id }
            })
            if (!trialPlan) {
                throw new InternalFlowiseError(StatusCodes.NOT_FOUND, `Trial plan ${user.id} not found`)
            }
            return [trialPlan]
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
    hasAvailableExecutions,
    getPaidPlanForOrg,
    getOrCreateTrialPlanForUser,
    incrementUsedExecutionCount,
    getPlanHistory
}
