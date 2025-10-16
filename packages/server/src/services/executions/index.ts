import { StatusCodes } from 'http-status-codes'
import { InternalFlowiseError } from '../../errors/internalFlowiseError'
import { getErrorMessage } from '../../errors/utils'
import { getRunningExpressApp } from '../../utils/getRunningExpressApp'
import { Execution } from '../../database/entities/Execution'
import { ExecutionState, IAgentflowExecutedData, IUser } from '../../Interface'
import { In } from 'typeorm'
import { ChatMessage } from '../../database/entities/ChatMessage'
import { _removeCredentialId } from '../../utils/buildAgentflow'

interface ExecutionFilters {
    id?: string
    agentflowId?: string
    sessionId?: string
    state?: ExecutionState
    startDate?: Date
    endDate?: Date
    page?: number
    limit?: number
}

interface UserFilter {
    userId?: string
    organizationId: string
}

const getExecutionById = async (executionId: string, user?: IUser): Promise<Execution | null> => {
    try {
        const appServer = getRunningExpressApp()
        const executionRepository = appServer.AppDataSource.getRepository(Execution)

        const queryOptions: any = { where: { id: executionId } }

        // If user is provided, add user/organization filtering
        if (user) {
            queryOptions.where.organizationId = user.organizationId
        }

        const res = await executionRepository.findOne(queryOptions)
        if (!res) {
            throw new InternalFlowiseError(StatusCodes.NOT_FOUND, `Execution ${executionId} not found`)
        }
        return res
    } catch (error) {
        throw new InternalFlowiseError(
            StatusCodes.INTERNAL_SERVER_ERROR,
            `Error: executionsService.getExecutionById - ${getErrorMessage(error)}`
        )
    }
}

const getPublicExecutionById = async (executionId: string): Promise<Execution | null> => {
    try {
        const appServer = getRunningExpressApp()
        const executionRepository = appServer.AppDataSource.getRepository(Execution)
        const res = await executionRepository.findOne({ where: { id: executionId, isPublic: true } })
        if (!res) {
            throw new InternalFlowiseError(StatusCodes.NOT_FOUND, `Execution ${executionId} not found`)
        }
        const executionData = typeof res?.executionData === 'string' ? JSON.parse(res?.executionData) : res?.executionData
        const executionDataWithoutCredentialId = executionData.map((data: IAgentflowExecutedData) => _removeCredentialId(data))
        const stringifiedExecutionData = JSON.stringify(executionDataWithoutCredentialId)
        return { ...res, executionData: stringifiedExecutionData }
    } catch (error) {
        throw new InternalFlowiseError(
            StatusCodes.INTERNAL_SERVER_ERROR,
            `Error: executionsService.getPublicExecutionById - ${getErrorMessage(error)}`
        )
    }
}

const getAllExecutions = async (filters: ExecutionFilters = {}, userFilter?: UserFilter): Promise<{ data: Execution[]; total: number }> => {
    try {
        const appServer = getRunningExpressApp()
        const { id, agentflowId, sessionId, state, startDate, endDate, page = 1, limit = 10 } = filters

        // Handle UUID fields properly using raw parameters to avoid type conversion issues
        // This uses the query builder instead of direct objects for compatibility with UUID fields
        const queryBuilder = appServer.AppDataSource.getRepository(Execution)
            .createQueryBuilder('execution')
            .leftJoinAndSelect('execution.agentflow', 'agentflow')
            .orderBy('execution.createdDate', 'DESC')
            .skip((page - 1) * limit)
            .take(limit)

        // Apply user/organization filtering if provided
        if (userFilter) {
            queryBuilder.andWhere('execution.organizationId = :organizationId', { organizationId: userFilter.organizationId })
            if (userFilter.userId) {
                queryBuilder.andWhere('execution.userId = :userId', { userId: userFilter.userId })
            }
        }

        if (id) queryBuilder.andWhere('execution.id = :id', { id })
        if (agentflowId) queryBuilder.andWhere('execution.agentflowId = :agentflowId', { agentflowId })
        if (sessionId) queryBuilder.andWhere('execution.sessionId = :sessionId', { sessionId })
        if (state) queryBuilder.andWhere('execution.state = :state', { state })

        // Date range conditions
        if (startDate && endDate) {
            queryBuilder.andWhere('execution.createdDate BETWEEN :startDate AND :endDate', { startDate, endDate })
        } else if (startDate) {
            queryBuilder.andWhere('execution.createdDate >= :startDate', { startDate })
        } else if (endDate) {
            queryBuilder.andWhere('execution.createdDate <= :endDate', { endDate })
        }

        const [data, total] = await queryBuilder.getManyAndCount()

        return { data, total }
    } catch (error) {
        throw new InternalFlowiseError(
            StatusCodes.INTERNAL_SERVER_ERROR,
            `Error: executionsService.getAllExecutions - ${getErrorMessage(error)}`
        )
    }
}

const updateExecution = async (executionId: string, data: Partial<Execution>, user?: IUser): Promise<Execution | null> => {
    try {
        const appServer = getRunningExpressApp()

        const queryOptions: any = { id: executionId }

        // If user is provided, add user/organization filtering
        if (user) {
            queryOptions.organizationId = user.organizationId
        }

        const execution = await appServer.AppDataSource.getRepository(Execution).findOneBy(queryOptions)
        if (!execution) {
            throw new InternalFlowiseError(StatusCodes.NOT_FOUND, `Execution ${executionId} not found`)
        }
        const updateExecution = new Execution()
        Object.assign(updateExecution, data)
        await appServer.AppDataSource.getRepository(Execution).merge(execution, updateExecution)
        const dbResponse = await appServer.AppDataSource.getRepository(Execution).save(execution)
        return dbResponse
    } catch (error) {
        throw new InternalFlowiseError(
            StatusCodes.INTERNAL_SERVER_ERROR,
            `Error: executionsService.updateExecution - ${getErrorMessage(error)}`
        )
    }
}

/**
 * Delete multiple executions by their IDs with user scoping
 * @param executionIds Array of execution IDs to delete
 * @param userFilter User/organization filter to ensure only owned executions are deleted
 * @returns Object with success status and count of deleted executions
 */
const deleteExecutions = async (executionIds: string[], userFilter?: UserFilter): Promise<{ success: boolean; deletedCount: number }> => {
    try {
        const appServer = getRunningExpressApp()
        const executionRepository = appServer.AppDataSource.getRepository(Execution)

        let whereConditions: any = {
            id: In(executionIds)
        }

        // Apply user/organization filtering if provided
        if (userFilter) {
            whereConditions.organizationId = userFilter.organizationId
            if (userFilter.userId) {
                whereConditions.userId = userFilter.userId
            }
        }

        // Delete executions where id is in the provided array and user has access
        const result = await executionRepository.delete(whereConditions)

        // Update chat message executionId column to NULL for the deleted executions
        await appServer.AppDataSource.getRepository(ChatMessage).update({ executionId: In(executionIds) }, { executionId: null as any })

        return {
            success: true,
            deletedCount: result.affected || 0
        }
    } catch (error) {
        throw new InternalFlowiseError(
            StatusCodes.INTERNAL_SERVER_ERROR,
            `Error: executionsService.deleteExecutions - ${getErrorMessage(error)}`
        )
    }
}

export default {
    getExecutionById,
    getAllExecutions,
    deleteExecutions,
    getPublicExecutionById,
    updateExecution
}
