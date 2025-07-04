import { InternalFlowiseError } from '../errors/internalFlowiseError'
import { StatusCodes } from 'http-status-codes'
import { Request } from 'express'

type Pagination = {
    page: number
    limit: number
}

export const getPageAndLimitParams = (req: Request): Pagination => {
    // by default assume no pagination
    let page = -1
    let limit = -1
    if (req.query.page) {
        // if page is provided, make sure it's a positive number
        page = parseInt(req.query.page as string)
        if (page < 0) {
            throw new InternalFlowiseError(StatusCodes.PRECONDITION_FAILED, `Error: page cannot be negative!`)
        }
    }
    if (req.query.limit) {
        // if limit is provided, make sure it's a positive number
        limit = parseInt(req.query.limit as string)
        if (limit < 0) {
            throw new InternalFlowiseError(StatusCodes.PRECONDITION_FAILED, `Error: limit cannot be negative!`)
        }
    }
    return { page, limit }
}
