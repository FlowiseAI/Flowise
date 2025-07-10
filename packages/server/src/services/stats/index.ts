import { StatusCodes } from 'http-status-codes'
import { ChatMessageRatingType, ChatType } from '../../Interface'
import { ChatMessage } from '../../database/entities/ChatMessage'
import { utilGetChatMessage } from '../../utils/getChatMessage'
import { ChatMessageFeedback } from '../../database/entities/ChatMessageFeedback'
import { InternalFlowiseError } from '../../errors/internalFlowiseError'
import { getErrorMessage } from '../../errors/utils'

// get stats for showing in chatflow
const getChatflowStats = async (
    chatflowid: string,
    chatTypes: ChatType[] | undefined,
    startDate?: string,
    endDate?: string,
    messageId?: string,
    feedback?: boolean,
    feedbackTypes?: ChatMessageRatingType[],
    activeWorkspaceId?: string
): Promise<any> => {
    try {
        const chatmessages = (await utilGetChatMessage({
            chatflowid,
            chatTypes,
            startDate,
            endDate,
            messageId,
            feedback,
            feedbackTypes,
            activeWorkspaceId
        })) as Array<ChatMessage & { feedback?: ChatMessageFeedback }>
        const totalMessages = chatmessages.length
        const totalFeedback = chatmessages.filter((message) => message?.feedback).length
        const positiveFeedback = chatmessages.filter((message) => message?.feedback?.rating === 'THUMBS_UP').length
        // count the number of unique sessions in the chatmessages - count unique sessionId
        const uniqueSessions = new Set(chatmessages.map((message) => message.sessionId))
        const totalSessions = uniqueSessions.size
        const dbResponse = {
            totalMessages,
            totalFeedback,
            positiveFeedback,
            totalSessions
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
