import { Request, Response, NextFunction } from 'express'
import csvParserService from '../../services/csv-parser'
import { InternalFlowiseError } from '../../errors/internalFlowiseError'
import { StatusCodes } from 'http-status-codes'

const getAllCsvParseRuns = async (req: Request, res: Response, next: NextFunction) => {
    try {
        if (!req.user) {
            throw new InternalFlowiseError(StatusCodes.UNAUTHORIZED, 'Error: csvParserController.getAllCsvParseRuns - Unauthorized')
        }
        const apiResponse = await csvParserService.getAllCsvParseRuns(req.user)
        return res.json(apiResponse)
    } catch (error) {
        next(error)
    }
}

const getCsvParseRunById = async (req: Request, res: Response, next: NextFunction) => {
    try {
        if (!req.user) {
            throw new InternalFlowiseError(StatusCodes.UNAUTHORIZED, 'Error: csvParserController.getCsvParseRunById - Unauthorized')
        }
        if (!req.params.id) {
            throw new InternalFlowiseError(
                StatusCodes.BAD_REQUEST,
                'Error: csvParserController.getCsvParseRunById - Missing csvParseRun ID'
            )
        }
        const apiResponse = await csvParserService.getCsvParseRunById(req.params.id, req.user)
        return res.json(apiResponse)
    } catch (error) {
        next(error)
    }
}

const createCsvParseRun = async (req: Request, res: Response, next: NextFunction) => {
    try {
        if (!req.user) {
            throw new InternalFlowiseError(StatusCodes.UNAUTHORIZED, 'Error: csvParserController.createCsvParseRun - Unauthorized')
        }
        if (!req.body) {
            throw new InternalFlowiseError(
                StatusCodes.PRECONDITION_FAILED,
                `Error: csvParserController.createCsvParseRun - body not provided`
            )
        }
        const apiResponse = await csvParserService.createCsvParseRun(req.user, req.body)
        return res.json(apiResponse)
    } catch (error) {
        next(error)
    }
}

export default {
    getAllCsvParseRuns,
    getCsvParseRunById,
    createCsvParseRun
}
