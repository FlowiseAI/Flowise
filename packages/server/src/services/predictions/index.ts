import { StatusCodes } from 'http-status-codes'
import { utilBuildChatflow } from '../../utils/buildChatflow'
import { Server } from 'socket.io'
import { ApiError } from '../../errors/apiError'
import { Request } from 'express'

const buildChatflow = async (fullRequest: Request, ioServer: Server) => {
    try {
        const dbResponse = await utilBuildChatflow(fullRequest, ioServer)
        return dbResponse
    } catch (error) {
        throw new ApiError(StatusCodes.INTERNAL_SERVER_ERROR, 'Error: predictionsServices.buildChatflow failed!')
    }
}

export default {
    buildChatflow
}
