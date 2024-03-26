import { MoreThanOrEqual, LessThanOrEqual } from 'typeorm'
import { chatType, IChatMessage } from '../../Interface'
import { ChatMessage } from '../../database/entities/ChatMessage'
import { getRunningExpressApp } from '../../utils/getRunningExpressApp'
import { utilGetChatMessage } from '../../utils/getChatMessage'

/**
 * Method that add chat messages.
 * @param {Partial<IChatMessage>} chatMessage
 */
const __addChatMessage = async (chatMessage: Partial<IChatMessage>): Promise<ChatMessage> => {
    const flowXpresApp = getRunningExpressApp()
    const newChatMessage = new ChatMessage()
    Object.assign(newChatMessage, chatMessage)
    const chatmessage = await flowXpresApp.AppDataSource.getRepository(ChatMessage).create(newChatMessage)
    return await flowXpresApp.AppDataSource.getRepository(ChatMessage).save(chatmessage)
}

/**
 * Method that get chat messages.
 * @param {string} chatflowid
 * @param {chatType} chatType
 * @param {string} sortOrder
 * @param {string} chatId
 * @param {string} memoryType
 * @param {string} sessionId
 * @param {string} startDate
 * @param {string} endDate
 */
const __getChatMessage = async (
    chatflowid: string,
    chatType: chatType | undefined,
    sortOrder: string = 'ASC',
    chatId?: string,
    memoryType?: string,
    sessionId?: string,
    startDate?: string,
    endDate?: string,
    messageId?: string
): Promise<ChatMessage[]> => {
    const flowXpresApp = getRunningExpressApp()
    const setDateToStartOrEndOfDay = (dateTimeStr: string, setHours: 'start' | 'end') => {
        const date = new Date(dateTimeStr)
        if (isNaN(date.getTime())) {
            return undefined
        }
        setHours === 'start' ? date.setHours(0, 0, 0, 0) : date.setHours(23, 59, 59, 999)
        return date
    }

    let fromDate
    if (startDate) fromDate = setDateToStartOrEndOfDay(startDate, 'start')

    let toDate
    if (endDate) toDate = setDateToStartOrEndOfDay(endDate, 'end')
    return await flowXpresApp.AppDataSource.getRepository(ChatMessage).find({
        where: {
            chatflowid,
            chatType,
            chatId,
            memoryType: memoryType ?? undefined,
            sessionId: sessionId ?? undefined,
            ...(fromDate && { createdDate: MoreThanOrEqual(fromDate) }),
            ...(toDate && { createdDate: LessThanOrEqual(toDate) }),
            id: messageId ?? undefined
        },
        order: {
            createdDate: sortOrder === 'DESC' ? 'DESC' : 'ASC'
        }
    })
}

const createChatMessage = async (chatMessage: Partial<IChatMessage>) => {
    try {
        const dbResponse = await __addChatMessage(chatMessage)
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
