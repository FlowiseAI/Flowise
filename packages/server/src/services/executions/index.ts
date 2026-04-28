import { StatusCodes } from 'http-status-codes'
import { In } from 'typeorm'
import { ChatMessage } from '../../database/entities/ChatMessage'
import { Execution } from '../../database/entities/Execution'
import { InternalFlowiseError } from '../../errors/internalFlowiseError'
import { getErrorMessage } from '../../errors/utils'
import { ExecutionState, IAgentflowExecutedData } from '../../Interface'
import { _removeCredentialId } from '../../utils'
import { getRunningExpressApp } from '../../utils/getRunningExpressApp'

export interface ExecutionFilters {
    id?: string
    agentflowId?: string
    agentflowName?: string
    sessionId?: string
    state?: ExecutionState
    startDate?: Date
    endDate?: Date
    page?: number
    limit?: number
    workspaceId?: string
}

const getExecutionById = async (executionId: string, workspaceId?: string): Promise<Execution | null> => {
    try {
        const appServer = getRunningExpressApp()
        const executionRepository = appServer.AppDataSource.getRepository(Execution)

        const query: any = { id: executionId }
        // Add workspace filtering if provided
        if (workspaceId) query.workspaceId = workspaceId

        const res = await executionRepository.findOne({ where: query })
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

const getAllExecutions = async (filters: ExecutionFilters = {}): Promise<{ data: Execution[]; total: number }> => {
    try {
        const appServer = getRunningExpressApp()
        const { id, agentflowId, agentflowName, sessionId, state, startDate, endDate, page = 1, limit = 12, workspaceId } = filters

        // Handle UUID fields properly using raw parameters to avoid type conversion issues
        // This uses the query builder instead of direct objects for compatibility with UUID fields
        const queryBuilder = appServer.AppDataSource.getRepository(Execution)
            .createQueryBuilder('execution')
            .leftJoinAndSelect('execution.agentflow', 'agentflow')
            .orderBy('execution.updatedDate', 'DESC')
            .skip((page - 1) * limit)
            .take(limit)

        if (id) queryBuilder.andWhere('execution.id = :id', { id })
        if (agentflowId) queryBuilder.andWhere('execution.agentflowId = :agentflowId', { agentflowId })
        if (agentflowName)
            queryBuilder.andWhere('LOWER(agentflow.name) LIKE LOWER(:agentflowName)', { agentflowName: `%${agentflowName}%` })
        if (sessionId) queryBuilder.andWhere('execution.sessionId = :sessionId', { sessionId })
        if (state) queryBuilder.andWhere('execution.state = :state', { state })
        if (workspaceId) queryBuilder.andWhere('execution.workspaceId = :workspaceId', { workspaceId })

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

const updateExecution = async (executionId: string, data: Partial<Execution>, workspaceId?: string): Promise<Execution | null> => {
    try {
        const appServer = getRunningExpressApp()

        const query: any = { id: executionId }
        // Add workspace filtering if provided
        if (workspaceId) query.workspaceId = workspaceId

        const execution = await appServer.AppDataSource.getRepository(Execution).findOneBy(query)
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
 * Delete multiple executions by their IDs
 * @param executionIds Array of execution IDs to delete
 * @param workspaceId Optional workspace ID to filter executions
 * @returns Object with success status and count of deleted executions
 */
const deleteExecutions = async (executionIds: string[], workspaceId?: string): Promise<{ success: boolean; deletedCount: number }> => {
    try {
        const appServer = getRunningExpressApp()
        const executionRepository = appServer.AppDataSource.getRepository(Execution)

        // Create the where condition with workspace filtering if provided
        const whereCondition: any = { id: In(executionIds) }
        if (workspaceId) whereCondition.workspaceId = workspaceId

        // Delete executions where id is in the provided array and belongs to the workspace
        const result = await executionRepository.delete(whereCondition)

        // Update chat message executionId column to NULL
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
