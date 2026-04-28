import { Request, Response, NextFunction } from 'express'
import variablesService from '../../services/variables'
import { Variable } from '../../database/entities/Variable'
import { InternalFlowiseError } from '../../errors/internalFlowiseError'
import { StatusCodes } from 'http-status-codes'
import { getPageAndLimitParams } from '../../utils/pagination'

const createVariable = async (req: Request, res: Response, next: NextFunction) => {
    try {
        if (typeof req.body === 'undefined') {
            throw new InternalFlowiseError(
                StatusCodes.PRECONDITION_FAILED,
                `Error: variablesController.createVariable - body not provided!`
            )
        }
        const orgId = req.user?.activeOrganizationId
        if (!orgId) {
            throw new InternalFlowiseError(StatusCodes.NOT_FOUND, `Error: toolsController.createTool - organization ${orgId} not found!`)
        }
        const workspaceId = req.user?.activeWorkspaceId
        if (!workspaceId) {
            throw new InternalFlowiseError(StatusCodes.NOT_FOUND, `Error: toolsController.createTool - workspace ${workspaceId} not found!`)
        }
        const body = req.body
        // Explicit allowlist — id/workspaceId/timestamps must not be overrideable by client
        const newVariable = new Variable()
        if (body.name !== undefined) newVariable.name = body.name
        if (body.value !== undefined) newVariable.value = body.value
        if (body.type !== undefined) newVariable.type = body.type
        newVariable.workspaceId = workspaceId
        const apiResponse = await variablesService.createVariable(newVariable, orgId)
        return res.json(apiResponse)
    } catch (error) {
        next(error)
    }
}

const deleteVariable = async (req: Request, res: Response, next: NextFunction) => {
    try {
        if (typeof req.params === 'undefined' || !req.params.id) {
            throw new InternalFlowiseError(StatusCodes.PRECONDITION_FAILED, 'Error: variablesController.deleteVariable - id not provided!')
        }
        const workspaceId = req.user?.activeWorkspaceId
        if (!workspaceId) {
            throw new InternalFlowiseError(
                StatusCodes.NOT_FOUND,
                `Error: variablesController.deleteVariable - workspace ${workspaceId} not found!`
            )
        }
        const apiResponse = await variablesService.deleteVariable(req.params.id, workspaceId)
        return res.json(apiResponse)
    } catch (error) {
        next(error)
    }
}

const getAllVariables = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { page, limit } = getPageAndLimitParams(req)
        const workspaceId = req.user?.activeWorkspaceId
        if (!workspaceId) {
            throw new InternalFlowiseError(
                StatusCodes.NOT_FOUND,
                `Error: variablesController.getAllVariables - workspace ${workspaceId} not found!`
            )
        }
        const apiResponse = await variablesService.getAllVariables(workspaceId, page, limit)
        return res.json(apiResponse)
    } catch (error) {
        next(error)
    }
}

const updateVariable = async (req: Request, res: Response, next: NextFunction) => {
    try {
        if (typeof req.params === 'undefined' || !req.params.id) {
            throw new InternalFlowiseError(StatusCodes.PRECONDITION_FAILED, 'Error: variablesController.updateVariable - id not provided!')
        }
        if (typeof req.body === 'undefined') {
            throw new InternalFlowiseError(
                StatusCodes.PRECONDITION_FAILED,
                'Error: variablesController.updateVariable - body not provided!'
            )
        }
        const workspaceId = req.user?.activeWorkspaceId
        if (!workspaceId) {
            throw new InternalFlowiseError(
                StatusCodes.NOT_FOUND,
                `Error: variablesController.updateVariable - workspace ${workspaceId} not found!`
            )
        }
        const variable = await variablesService.getVariableById(req.params.id, workspaceId)
        if (!variable) {
            return res.status(404).send('Variable not found in the database')
        }
        const body = req.body
        // Explicit allowlist — id/workspaceId/timestamps must not be overrideable by client
        const updatedVariable = new Variable()
        if (body.name !== undefined) updatedVariable.name = body.name
        if (body.value !== undefined) updatedVariable.value = body.value
        if (body.type !== undefined) updatedVariable.type = body.type
        const apiResponse = await variablesService.updateVariable(variable, updatedVariable)
        return res.json(apiResponse)
    } catch (error) {
        next(error)
    }
}

export default {
    createVariable,
    deleteVariable,
    getAllVariables,
    updateVariable
}
