import { getRunningExpressApp } from '../../utils/getRunningExpressApp'
import { chatType } from '../../Interface'
import { ChatMessage } from '../../database/entities/ChatMessage'
import { utilGetChatMessage } from '../../utils/getChatMessage'
import { ChatMessageFeedback } from '../../database/entities/ChatMessageFeedback'

// get stats for showing in chatflow
const getChatflowStats = async (
    chatflowid: string,
    chatTypeFilter: chatType | undefined,
    sortOrder: string = 'ASC',
    chatId?: string,
    memoryType?: string,
    sessionId?: string,
    startDate?: string,
    endDate?: string,
    messageId?: string,
    feedback?: boolean
): Promise<any> => {
    try {
        const flowXpresApp = getRunningExpressApp()
        const chatmessages = (await utilGetChatMessage(
            chatflowid,
            chatTypeFilter,
            undefined,
            undefined,
            undefined,
            undefined,
            startDate,
            endDate,
            '',
            true
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
        throw new Error(`Error: statsService.getChatflowStats - ${error}`)
    }
}

export default {
    getChatflowStats
}
