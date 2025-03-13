import { StatusCodes } from 'http-status-codes'
import { InternalFlowiseError } from '../../errors/internalFlowiseError'
import { getErrorMessage } from '../../errors/utils'
import { getRunningExpressApp } from '../../utils/getRunningExpressApp'
import { Execution } from '../../database/entities/Execution'
import { ExecutionState } from '../../Interface'
import { Between, MoreThanOrEqual, LessThanOrEqual } from 'typeorm'

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

const getAllExecutions = async (filters: ExecutionFilters = {}): Promise<{ data: Execution[]; total: number }> => {
    try {
        const appServer = getRunningExpressApp()
        const { id, agentflowId, sessionId, state, startDate, endDate, page = 1, limit = 10 } = filters

        // Build where conditions
        const whereConditions: any = {}

        if (id) whereConditions.id = id
        if (agentflowId) whereConditions.agentflowId = agentflowId
        if (sessionId) whereConditions.sessionId = sessionId
        if (state) whereConditions.state = state

        // Date range conditions using TypeORM operators
        let createdDateQuery
        if (startDate || endDate) {
            if (startDate && endDate) {
                createdDateQuery = Between(startDate, endDate)
            } else if (startDate) {
                createdDateQuery = MoreThanOrEqual(startDate)
            } else if (endDate) {
                createdDateQuery = LessThanOrEqual(endDate)
            }

            whereConditions.createdDate = createdDateQuery
        }

        const skip = (page - 1) * limit

        const [data, total] = await appServer.AppDataSource.getRepository(Execution).findAndCount({
            where: whereConditions,
            relations: {
                agentflow: true
            },
            order: {
                createdDate: 'DESC'
            },
            skip,
            take: limit
        })

        return { data, total }
    } catch (error) {
        throw new InternalFlowiseError(
            StatusCodes.INTERNAL_SERVER_ERROR,
            `Error: executionsService.getAllExecutions - ${getErrorMessage(error)}`
        )
    }
}

export default {
    getAllExecutions
}
