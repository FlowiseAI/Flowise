import { Request, Response } from 'express'
import { upsertVector } from '../../utils/upsertVector'

const upsertVectorMiddleware = async (req: Request, res: Response, isInternal: boolean = false) => {
    try {
        await upsertVector(req, res, isInternal)
    } catch (error) {
        throw new Error(`Error: vectorsService.getRateLimiter - ${error}`)
    }
}

export default {
    upsertVectorMiddleware
}
