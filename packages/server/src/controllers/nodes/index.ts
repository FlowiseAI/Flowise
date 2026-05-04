import { Request, Response, NextFunction } from 'express'
import _ from 'lodash'
import nodesService from '../../services/nodes'
import { ClientType, VALID_CLIENT_TYPES } from 'flowise-components'
import { InternalFlowiseError } from '../../errors/internalFlowiseError'
import { StatusCodes } from 'http-status-codes'
import { getWorkspaceSearchOptionsFromReq } from '../../enterprise/utils/ControllerServiceUtils'

// if req.query.client does not contain a valid client type, then return undefined so it won't filter the nodes unnecessarily
const parseClientParam = (req: Request): ClientType | undefined => {
    const raw = req.query.client as ClientType | undefined
    return raw && VALID_CLIENT_TYPES.has(raw) ? (raw as ClientType) : undefined
}

const getAllNodes = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const apiResponse = await nodesService.getAllNodes(parseClientParam(req))
        return res.json(apiResponse)
    } catch (error) {
        next(error)
    }
}

const getNodeByName = async (req: Request, res: Response, next: NextFunction) => {
    try {
        if (typeof req.params === 'undefined' || !req.params.name) {
            throw new InternalFlowiseError(StatusCodes.PRECONDITION_FAILED, `Error: nodesController.getNodeByName - name not provided!`)
        }
        const apiResponse = await nodesService.getNodeByName(req.params.name, parseClientParam(req))
        return res.json(apiResponse)
    } catch (error) {
        next(error)
    }
}

const getNodesByCategory = async (req: Request, res: Response, next: NextFunction) => {
    try {
        if (typeof req.params.name === 'undefined' || req.params.name === '') {
            throw new InternalFlowiseError(
                StatusCodes.PRECONDITION_FAILED,
                `Error: nodesController.getNodesByCategory - name not provided!`
            )
        }
        const name = _.unescape(req.params.name)
        const apiResponse = await nodesService.getAllNodesForCategory(name, parseClientParam(req))
        return res.json(apiResponse)
    } catch (error) {
        next(error)
    }
}

const getSingleNodeIcon = async (req: Request, res: Response, next: NextFunction) => {
    try {
        if (typeof req.params === 'undefined' || !req.params.name) {
            throw new InternalFlowiseError(StatusCodes.PRECONDITION_FAILED, `Error: nodesController.getSingleNodeIcon - name not provided!`)
        }
        const apiResponse = await nodesService.getSingleNodeIcon(req.params.name)
        return res.sendFile(apiResponse)
    } catch (error) {
        next(error)
    }
}

const getSingleNodeAsyncOptions = async (req: Request, res: Response, next: NextFunction) => {
    try {
        if (!req.body) {
            throw new InternalFlowiseError(
                StatusCodes.PRECONDITION_FAILED,
                `Error: nodesController.getSingleNodeAsyncOptions - body not provided!`
            )
        }
        if (typeof req.params === 'undefined' || !req.params.name) {
            throw new InternalFlowiseError(
                StatusCodes.PRECONDITION_FAILED,
                `Error: nodesController.getSingleNodeAsyncOptions - name not provided!`
            )
        }
        const body = req.body
        body.searchOptions = getWorkspaceSearchOptionsFromReq(req)
        const apiResponse = await nodesService.getSingleNodeAsyncOptions(req.params.name, body)
        return res.json(apiResponse)
    } catch (error) {
        next(error)
    }
}

const executeCustomFunction = async (req: Request, res: Response, next: NextFunction) => {
    try {
        if (!req.body) {
            throw new InternalFlowiseError(
                StatusCodes.PRECONDITION_FAILED,
                `Error: nodesController.executeCustomFunction - body not provided!`
            )
        }
        const orgId = req.user?.activeOrganizationId
        const workspaceId = req.user?.activeWorkspaceId
        const canViewVariables = !!(req.user?.isOrganizationAdmin || req.user?.permissions?.includes('variables:view'))
        const apiResponse = await nodesService.executeCustomFunction(req.body, workspaceId, orgId, canViewVariables)
        return res.json(apiResponse)
    } catch (error) {
        next(error)
    }
}

export default {
    getAllNodes,
    getNodeByName,
    getSingleNodeIcon,
    getSingleNodeAsyncOptions,
    executeCustomFunction,
    getNodesByCategory
}
