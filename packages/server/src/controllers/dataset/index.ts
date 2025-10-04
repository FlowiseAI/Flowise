import { Request, Response, NextFunction } from 'express'
import { InternalFlowiseError } from '../../errors/internalFlowiseError'
import datasetService from '../../services/dataset'
import { StatusCodes } from 'http-status-codes'
import { getPageAndLimitParams } from '../../utils/pagination'

const getAllDatasets = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { page, limit } = getPageAndLimitParams(req)
        const workspaceId = req.user?.activeWorkspaceId
        if (!workspaceId) {
            throw new InternalFlowiseError(
                StatusCodes.NOT_FOUND,
                `Error: datasetController.getAllDatasets - workspace ${workspaceId} not found!`
            )
        }
        const apiResponse = await datasetService.getAllDatasets(workspaceId, page, limit)
        return res.json(apiResponse)
    } catch (error) {
        next(error)
    }
}

const getDataset = async (req: Request, res: Response, next: NextFunction) => {
    try {
        if (typeof req.params === 'undefined' || !req.params.id) {
            throw new InternalFlowiseError(StatusCodes.PRECONDITION_FAILED, `Error: datasetService.getDataset - id not provided!`)
        }
        const { page, limit } = getPageAndLimitParams(req)
        const workspaceId = req.user?.activeWorkspaceId
        if (!workspaceId) {
            throw new InternalFlowiseError(
                StatusCodes.NOT_FOUND,
                `Error: datasetController.getDataset - workspace ${workspaceId} not found!`
            )
        }
        const apiResponse = await datasetService.getDataset(req.params.id, workspaceId, page, limit)
        return res.json(apiResponse)
    } catch (error) {
        next(error)
    }
}

const createDataset = async (req: Request, res: Response, next: NextFunction) => {
    try {
        if (!req.body) {
            throw new InternalFlowiseError(StatusCodes.PRECONDITION_FAILED, `Error: datasetService.createDataset - body not provided!`)
        }
        const body = req.body
        const workspaceId = req.user?.activeWorkspaceId
        if (!workspaceId) {
            throw new InternalFlowiseError(
                StatusCodes.NOT_FOUND,
                `Error: datasetController.createDataset - workspace ${workspaceId} not found!`
            )
        }
        body.workspaceId = workspaceId
        const apiResponse = await datasetService.createDataset(body)
        return res.json(apiResponse)
    } catch (error) {
        next(error)
    }
}

const updateDataset = async (req: Request, res: Response, next: NextFunction) => {
    try {
        if (!req.body) {
            throw new InternalFlowiseError(StatusCodes.PRECONDITION_FAILED, `Error: datasetService.updateDataset - body not provided!`)
        }
        if (typeof req.params === 'undefined' || !req.params.id) {
            throw new InternalFlowiseError(StatusCodes.PRECONDITION_FAILED, `Error: datasetService.updateDataset - id not provided!`)
        }
        const workspaceId = req.user?.activeWorkspaceId
        if (!workspaceId) {
            throw new InternalFlowiseError(
                StatusCodes.NOT_FOUND,
                `Error: datasetController.updateDataset - workspace ${workspaceId} not found!`
            )
        }
        const apiResponse = await datasetService.updateDataset(req.params.id, req.body, workspaceId)
        return res.json(apiResponse)
    } catch (error) {
        next(error)
    }
}

const deleteDataset = async (req: Request, res: Response, next: NextFunction) => {
    try {
        if (typeof req.params === 'undefined' || !req.params.id) {
            throw new InternalFlowiseError(StatusCodes.PRECONDITION_FAILED, `Error: datasetService.deleteDataset - id not provided!`)
        }
        const workspaceId = req.user?.activeWorkspaceId
        if (!workspaceId) {
            throw new InternalFlowiseError(
                StatusCodes.NOT_FOUND,
                `Error: datasetController.deleteDataset - workspace ${workspaceId} not found!`
            )
        }
        const apiResponse = await datasetService.deleteDataset(req.params.id, workspaceId)
        return res.json(apiResponse)
    } catch (error) {
        next(error)
    }
}

const addDatasetRow = async (req: Request, res: Response, next: NextFunction) => {
    try {
        if (!req.body) {
            throw new InternalFlowiseError(StatusCodes.PRECONDITION_FAILED, `Error: datasetService.addDatasetRow - body not provided!`)
        }
        if (!req.body.datasetId) {
            throw new InternalFlowiseError(StatusCodes.PRECONDITION_FAILED, `Error: datasetService.addDatasetRow - datasetId not provided!`)
        }
        const workspaceId = req.user?.activeWorkspaceId
        if (!workspaceId) {
            throw new InternalFlowiseError(
                StatusCodes.NOT_FOUND,
                `Error: datasetController.addDatasetRow - workspace ${workspaceId} not found!`
            )
        }
        req.body.workspaceId = workspaceId
        const apiResponse = await datasetService.addDatasetRow(req.body)
        return res.json(apiResponse)
    } catch (error) {
        next(error)
    }
}

const updateDatasetRow = async (req: Request, res: Response, next: NextFunction) => {
    try {
        if (!req.body) {
            throw new InternalFlowiseError(StatusCodes.PRECONDITION_FAILED, `Error: datasetService.updateDatasetRow - body not provided!`)
        }
        if (typeof req.params === 'undefined' || !req.params.id) {
            throw new InternalFlowiseError(StatusCodes.PRECONDITION_FAILED, `Error: datasetService.updateDatasetRow - id not provided!`)
        }
        const workspaceId = req.user?.activeWorkspaceId
        if (!workspaceId) {
            throw new InternalFlowiseError(
                StatusCodes.NOT_FOUND,
                `Error: datasetController.updateDatasetRow - workspace ${workspaceId} not found!`
            )
        }
        req.body.workspaceId = workspaceId
        const apiResponse = await datasetService.updateDatasetRow(req.params.id, req.body)
        return res.json(apiResponse)
    } catch (error) {
        next(error)
    }
}

const deleteDatasetRow = async (req: Request, res: Response, next: NextFunction) => {
    try {
        if (typeof req.params === 'undefined' || !req.params.id) {
            throw new InternalFlowiseError(StatusCodes.PRECONDITION_FAILED, `Error: datasetService.deleteDatasetRow - id not provided!`)
        }
        const workspaceId = req.user?.activeWorkspaceId
        if (!workspaceId) {
            throw new InternalFlowiseError(
                StatusCodes.NOT_FOUND,
                `Error: datasetController.deleteDatasetRow - workspace ${workspaceId} not found!`
            )
        }
        const apiResponse = await datasetService.deleteDatasetRow(req.params.id, workspaceId)
        return res.json(apiResponse)
    } catch (error) {
        next(error)
    }
}

const patchDeleteRows = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const ids = req.body.ids ?? []
        const workspaceId = req.user?.activeWorkspaceId
        if (!workspaceId) {
            throw new InternalFlowiseError(
                StatusCodes.NOT_FOUND,
                `Error: datasetController.patchDeleteRows - workspace ${workspaceId} not found!`
            )
        }
        const apiResponse = await datasetService.patchDeleteRows(ids, workspaceId)
        return res.json(apiResponse)
    } catch (error) {
        next(error)
    }
}

const reorderDatasetRow = async (req: Request, res: Response, next: NextFunction) => {
    try {
        if (!req.body) {
            throw new InternalFlowiseError(StatusCodes.PRECONDITION_FAILED, `Error: datasetService.reorderDatasetRow - body not provided!`)
        }
        const workspaceId = req.user?.activeWorkspaceId
        if (!workspaceId) {
            throw new InternalFlowiseError(
                StatusCodes.NOT_FOUND,
                `Error: datasetController.reorderDatasetRow - workspace ${workspaceId} not found!`
            )
        }
        const apiResponse = await datasetService.reorderDatasetRow(req.body.datasetId, req.body.rows, workspaceId)
        return res.json(apiResponse)
    } catch (error) {
        next(error)
    }
}
export default {
    getAllDatasets,
    getDataset,
    createDataset,
    updateDataset,
    deleteDataset,
    addDatasetRow,
    updateDatasetRow,
    deleteDatasetRow,
    patchDeleteRows,
    reorderDatasetRow
}
