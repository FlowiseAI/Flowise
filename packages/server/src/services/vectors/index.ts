import { Request } from 'express'
import { StatusCodes } from 'http-status-codes'
import { upsertVector } from '../../utils/upsertVector'
import { InternalFlowiseError } from '../../errors/internalFlowiseError'
import { getErrorMessage } from '../../errors/utils'

const upsertVectorMiddleware = async (req: Request, isInternal: boolean = false) => {
    try {
        return await upsertVector(req, isInternal)
    } catch (error) {
        throw new InternalFlowiseError(StatusCodes.INTERNAL_SERVER_ERROR, `Error: vectorsService.upsertVector - ${getErrorMessage(error)}`)
    }
}

export default {
    upsertVectorMiddleware
}
