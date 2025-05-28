import { Request, Response, NextFunction } from 'express'
import { InternalFlowiseError } from '../../errors/internalFlowiseError'
import datasetService from '../../services/dataset'
import { StatusCodes } from 'http-status-codes'

const getAllDatasets = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const apiResponse = await datasetService.getAllDatasets(req.user?.activeWorkspaceId)
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
        const apiResponse = await datasetService.getDataset(req.params.id)
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
        body.workspaceId = req.user?.activeWorkspaceId
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
        const apiResponse = await datasetService.updateDataset(req.params.id, req.body)
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
        const apiResponse = await datasetService.deleteDataset(req.params.id)
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
        const apiResponse = await datasetService.deleteDatasetRow(req.params.id)
        return res.json(apiResponse)
    } catch (error) {
        next(error)
    }
}

const patchDeleteRows = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const ids = req.body.ids ?? []
        const apiResponse = await datasetService.patchDeleteRows(ids)
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

        const apiResponse = await datasetService.reorderDatasetRow(req.body.datasetId, req.body.rows)
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
