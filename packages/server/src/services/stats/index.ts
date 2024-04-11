import { StatusCodes } from 'http-status-codes'
import { chatType } from '../../Interface'
import { ChatMessage } from '../../database/entities/ChatMessage'
import { utilGetChatMessage } from '../../utils/getChatMessage'
import { ChatMessageFeedback } from '../../database/entities/ChatMessageFeedback'
import { InternalFlowiseError } from '../../errors/internalFlowiseError'
import { getErrorMessage } from '../../errors/utils'

// get stats for showing in chatflow
const getChatflowStats = async (
    chatflowid: string,
    chatTypeFilter: chatType | undefined,
    startDate?: string,
    endDate?: string,
    messageId?: string,
    feedback?: boolean
): Promise<any> => {
    try {
        const chatmessages = (await utilGetChatMessage(
            chatflowid,
            chatTypeFilter,
            undefined,
            undefined,
            undefined,
            undefined,
            startDate,
            endDate,
            messageId,
            feedback
        )) as Array<ChatMessage & { feedback?: ChatMessageFeedback }>
        const totalMessages = chatmessages.length
        const totalFeedback = chatmessages.filter((message) => message?.feedback).length
        const positiveFeedback = chatmessages.filter((message) => message?.feedback?.rating === 'THUMBS_UP').length
        const dbResponse = {
            totalMessages,
            totalFeedback,
            positiveFeedback
        }

        return dbResponse
    } catch (error) {
        throw new InternalFlowiseError(
            StatusCodes.INTERNAL_SERVER_ERROR,
            `Error: statsService.getChatflowStats - ${getErrorMessage(error)}`
        )
    }
}

export default {
    getChatflowStats
}
