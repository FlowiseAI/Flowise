import { chatType, IChatMessage } from '../../Interface'
import { utilGetChatMessage } from '../../utils/getChatMessage'
import { utilAddChatMessage } from '../../utils/addChatMesage'

// Add chatmessages for chatflowid
const createChatMessage = async (chatMessage: Partial<IChatMessage>) => {
    try {
        const dbResponse = await utilAddChatMessage(chatMessage)
        return dbResponse
    } catch (error) {
        throw new Error(`Error: chatMessagesService.createChatMessage - ${error}`)
    }
}

// Get all chatmessages from chatflowid
const getAllChatMessages = async (
    chatflowId: string,
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
        const dbResponse = await utilGetChatMessage(
            chatflowId,
            chatTypeFilter,
            sortOrder,
            chatId,
            memoryType,
            sessionId,
            startDate,
            endDate,
            messageId,
            feedback
        )
        return dbResponse
    } catch (error) {
        throw new Error(`Error: chatMessagesService.getAllChatMessages - ${error}`)
    }
}

// Get internal chatmessages from chatflowid
const getAllInternalChatMessages = async (
    chatflowId: string,
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
        const dbResponse = await utilGetChatMessage(
            chatflowId,
            chatTypeFilter,
            sortOrder,
            chatId,
            memoryType,
            sessionId,
            startDate,
            endDate,
            messageId,
            feedback
        )
        return dbResponse
    } catch (error) {
        throw new Error(`Error: chatMessagesService.getAllInternalChatMessages - ${error}`)
    }
}

export default {
    createChatMessage,
    getAllChatMessages,
    getAllInternalChatMessages
}
