import { Request } from 'express'
import { StatusCodes } from 'http-status-codes'
import { buildNewflow } from '../../utils/buildNewflow'
import { InternalFlowiseError } from '../../errors/internalFlowiseError'
import { getErrorMessage } from '../../errors/utils'

const buildChatflow = async (fullRequest: Request) => {
    try {
        const result = await buildNewflow(fullRequest)
        return {
            text: result.finalResult?.text || '',
            status: result.status,
            executionTime: result.executionTime,
            tokenCount: result.tokenCount,
            results: result.results,
            chatId: result.chatId
        }
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
