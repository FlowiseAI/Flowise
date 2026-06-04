import { InternalFlowiseError } from '../errors/internalFlowiseError'
import { StatusCodes } from 'http-status-codes'
import { Request } from 'express'

type Pagination = {
    page: number
    limit: number
}

const parsePaginationParam = (value: unknown, paramName: 'page' | 'limit'): number => {
    if (Array.isArray(value) || typeof value !== 'string' || !/^\d+$/.test(value)) {
        throw new InternalFlowiseError(StatusCodes.PRECONDITION_FAILED, `Error: ${paramName} must be a non-negative integer!`)
    }

    const parsedValue = Number(value)
    if (!Number.isSafeInteger(parsedValue)) {
        throw new InternalFlowiseError(StatusCodes.PRECONDITION_FAILED, `Error: ${paramName} must be a non-negative integer!`)
    }

    return parsedValue
}

export const getPageAndLimitParams = (req: Request): Pagination => {
    // by default assume no pagination
    let page = -1
    let limit = -1
    if (req.query.page) {
        page = parsePaginationParam(req.query.page, 'page')
    }
    if (req.query.limit) {
        limit = parsePaginationParam(req.query.limit, 'limit')
    }
    return { page, limit }
}
