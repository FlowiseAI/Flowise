import { Request, Response, NextFunction } from 'express'
import executionsService from '../../services/executions'
import { ExecutionState } from '../../Interface'
import { InternalFlowiseError } from '../../errors/internalFlowiseError'
import { StatusCodes } from 'http-status-codes'
import checkOwnership from '../../utils/checkOwnership'

const getExecutionById = async (req: Request, res: Response, next: NextFunction) => {
    try {
        if (!req.user) {
            throw new InternalFlowiseError(StatusCodes.UNAUTHORIZED, 'Unauthorized')
        }

        const executionId = req.params.id
        const execution = await executionsService.getExecutionById(executionId, req.user)

        // Check ownership for the specific execution
        if (!(await checkOwnership(execution, req.user, req))) {
            throw new InternalFlowiseError(StatusCodes.UNAUTHORIZED, `Unauthorized`)
        }

        return res.json(execution)
    } catch (error) {
        next(error)
    }
}

const getPublicExecutionById = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const executionId = req.params.id
        const execution = await executionsService.getPublicExecutionById(executionId)
        return res.json(execution)
    } catch (error) {
        next(error)
    }
}

const updateExecution = async (req: Request, res: Response, next: NextFunction) => {
    try {
        if (!req.user) {
            throw new InternalFlowiseError(StatusCodes.UNAUTHORIZED, 'Unauthorized')
        }

        const executionId = req.params.id

        // First check if the execution exists and the user has access to it
        const existingExecution = await executionsService.getExecutionById(executionId, req.user)
        if (!(await checkOwnership(existingExecution, req.user, req))) {
            throw new InternalFlowiseError(StatusCodes.UNAUTHORIZED, `Unauthorized`)
        }

        const execution = await executionsService.updateExecution(executionId, req.body, req.user)
        return res.json(execution)
    } catch (error) {
        next(error)
    }
}

const getAllExecutions = async (req: Request, res: Response, next: NextFunction) => {
    try {
        if (!req.user) {
            throw new InternalFlowiseError(StatusCodes.UNAUTHORIZED, 'Unauthorized')
        }

        // Extract all possible filters from query params
        const filters: any = {}

        // ID filter
        if (req.query.id) filters.id = req.query.id as string

        // Flow and session filters
        if (req.query.agentflowId) filters.agentflowId = req.query.agentflowId as string
        if (req.query.sessionId) filters.sessionId = req.query.sessionId as string

        // State filter
        if (req.query.state) {
            const stateValue = req.query.state as string
            if (['INPROGRESS', 'FINISHED', 'ERROR', 'TERMINATED', 'TIMEOUT', 'STOPPED'].includes(stateValue)) {
                filters.state = stateValue as ExecutionState
            }
        }

        // Date filters
        if (req.query.startDate) {
            filters.startDate = new Date(req.query.startDate as string)
        }

        if (req.query.endDate) {
            filters.endDate = new Date(req.query.endDate as string)
        }

        // Pagination
        if (req.query.page) {
            filters.page = parseInt(req.query.page as string, 10)
        }

        if (req.query.limit) {
            filters.limit = parseInt(req.query.limit as string, 10)
        }

        // Apply the user/organization filter from the enforceAbility middleware
        const userFilter = res.locals.filter
        const apiResponse = await executionsService.getAllExecutions(filters, userFilter)

        return res.json(apiResponse)
    } catch (error) {
        next(error)
    }
}

/**
 * Delete multiple executions by their IDs
 * If a single ID is provided in the URL params, it will delete that execution
 * If an array of IDs is provided in the request body, it will delete all those executions
 */
const deleteExecutions = async (req: Request, res: Response, next: NextFunction) => {
    try {
        if (!req.user) {
            throw new InternalFlowiseError(StatusCodes.UNAUTHORIZED, 'Unauthorized')
        }

        let executionIds: string[] = []

        // Check if we're deleting a single execution from URL param
        if (req.params.id) {
            executionIds = [req.params.id]
        }
        // Check if we're deleting multiple executions from request body
        else if (req.body.executionIds && Array.isArray(req.body.executionIds)) {
            executionIds = req.body.executionIds
        } else {
            return res.status(400).json({ success: false, message: 'No execution IDs provided' })
        }

        // Apply the user/organization filter from the enforceAbility middleware
        const userFilter = res.locals.filter
        const result = await executionsService.deleteExecutions(executionIds, userFilter)
        return res.json(result)
    } catch (error) {
        next(error)
    }
}

export default {
    getAllExecutions,
    deleteExecutions,
    getExecutionById,
    getPublicExecutionById,
    updateExecution
}
