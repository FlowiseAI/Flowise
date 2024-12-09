import { Request } from 'express'
import { Server } from 'socket.io'
import { StatusCodes } from 'http-status-codes'
import { utilBuildChatflow } from '../../utils/buildChatflow'
import { InternalFlowiseError } from '../../errors/internalFlowiseError'
import { getErrorMessage } from '../../errors/utils'
import chatflowsService from '../chatflows'

const buildChatflow = async (fullRequest: Request, ioServer: Server) => {
    try {
        const { chatId, question: prompt, overrideConfig } = fullRequest.body
        const chatflowId = fullRequest.params.id
        const user = fullRequest.user!

        // Ensure overrideConfig.sessionId is a valid UUID v4
        if (overrideConfig?.sessionId) {
            const sessionId = overrideConfig.sessionId
            const uuidV4Regex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
            if (!uuidV4Regex.test(sessionId)) {
                const crypto = require('crypto')
                const hash = crypto.createHash('sha256').update(sessionId.toString()).digest('hex')
                const consistentUuid = [
                    hash.slice(0, 8),
                    hash.slice(8, 12),
                    '4' + hash.slice(13, 16), // Ensure the version is '4'
                    ((parseInt(hash.slice(16, 18), 16) & 0x3f) | 0x80).toString(16) + hash.slice(18, 20), // Ensure the variant is '8', '9', 'a', or 'b'
                    hash.slice(20, 32)
                ].join('-')
                overrideConfig.sessionId = consistentUuid
                overrideConfig.vars.sessionId = overrideConfig?.sessionId
                fullRequest.body.overrideConfig = overrideConfig
            }
        }

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
