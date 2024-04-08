import { Request, Response } from 'express'
import { upsertVector } from '../../utils/upsertVector'
import { InternalFlowiseError } from '../../errors/internalFlowiseError'
import { StatusCodes } from 'http-status-codes'

const upsertVectorMiddleware = async (req: Request, res: Response, isInternal: boolean = false) => {
    try {
        await upsertVector(req, res, isInternal)
    } catch (error) {
        throw new InternalFlowiseError(StatusCodes.INTERNAL_SERVER_ERROR, `Error: vectorsService.getRateLimiter - ${error}`)
    }
}

export default {
    upsertVectorMiddleware
}
