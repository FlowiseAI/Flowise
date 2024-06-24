import { Request, Response, NextFunction } from 'express'
import fetchLinksService from '../../services/fetch-links'
import { InternalFlowiseError } from '../../errors/internalFlowiseError'
import { StatusCodes } from 'http-status-codes'

const getAllLinks = async (req: Request, res: Response, next: NextFunction) => {
    try {
        if (typeof req.query === 'undefined' || !req.query.url) {
            throw new InternalFlowiseError(StatusCodes.PRECONDITION_FAILED, `Error: fetchLinksController.getAllLinks - url not provided!`)
        }
        if (typeof req.query === 'undefined' || !req.query.relativeLinksMethod) {
            throw new InternalFlowiseError(
                StatusCodes.PRECONDITION_FAILED,
                `Error: fetchLinksController.getAllLinks - relativeLinksMethod not provided!`
            )
        }
        if (typeof req.query === 'undefined' || !req.query.limit) {
            throw new InternalFlowiseError(StatusCodes.PRECONDITION_FAILED, `Error: fetchLinksController.getAllLinks - limit not provided!`)
        }
        const apiResponse = await fetchLinksService.getAllLinks(
            req.query.url as string,
            req.query.relativeLinksMethod as string,
            req.query.limit as string
        )
        return res.json(apiResponse)
    } catch (error) {
        next(error)
    }
}

export default {
    getAllLinks
}
