import { Request } from 'express'
import { Server } from 'socket.io'
import { StatusCodes } from 'http-status-codes'
import { utilBuildChatflow } from '../../utils/buildChatflow'
import { InternalFlowiseError } from '../../errors/internalFlowiseError'
import { getErrorMessage } from '../../errors/utils'
import chatflowsService from '../chatflows'

const buildChatflow = async (fullRequest: Request, ioServer: Server) => {
    try {
        const { chatId, question: prompt, history } = fullRequest.body
        const chatflowId = fullRequest.params.id
        const user = fullRequest.user!

        // First build and get response from chatflow
        const response = await utilBuildChatflow(fullRequest, ioServer)

        // After successful response, upsert the chat
        if (response.chatId) {
            await chatflowsService.upsertChat({
                id: chatId,
                user,
                prompt,
                chatflowId,
                chatflowChatId: response.chatId
            })
        }

        return response
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
