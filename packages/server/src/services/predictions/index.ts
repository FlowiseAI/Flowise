import { Request } from 'express'
import { Server } from 'socket.io'
import { StatusCodes } from 'http-status-codes'
import { utilBuildChatflow } from '../../utils/buildChatflow'
import { InternalFlowiseError } from '../../errors/internalFlowiseError'
import { getErrorMessage } from '../../errors/utils'

const buildChatflow = async (fullRequest: Request, ioServer: Server) => {
    try {
        const dbResponse = await utilBuildChatflow(fullRequest, ioServer)
        return dbResponse
    } catch (error) {
        throw new InternalFlowiseError(
            StatusCodes.INTERNAL_SERVER_ERROR,
            `Error: predictionsServices.buildChatflow - ${getErrorMessage(error)}`
        )
    }
}

export default {
    buildChatflow
}
