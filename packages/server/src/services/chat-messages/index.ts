import { FindOptionsWhere } from 'typeorm'
import path from 'path'
import { chatType, IChatMessage } from '../../Interface'
import { utilGetChatMessage } from '../../utils/getChatMessage'
import { utilAddChatMessage } from '../../utils/addChatMesage'
import { getRunningExpressApp } from '../../utils/getRunningExpressApp'
import { ChatMessageFeedback } from '../../database/entities/ChatMessageFeedback'
import { getStoragePath } from 'flowise-components'
import { deleteFolderRecursive } from '../../utils'
import logger from '../../utils/logger'
import { ChatMessage } from '../../database/entities/ChatMessage'

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

const removeAllChatMessages = async (chatId: string, chatflowid: string, deleteOptions: FindOptionsWhere<ChatMessage>): Promise<any> => {
    try {
        const appServer = getRunningExpressApp()

        // remove all related feedback records
        const feedbackDeleteOptions: FindOptionsWhere<ChatMessageFeedback> = { chatId }
        await appServer.AppDataSource.getRepository(ChatMessageFeedback).delete(feedbackDeleteOptions)

        // Delete all uploads corresponding to this chatflow/chatId
        if (chatId) {
            try {
                const directory = path.join(getStoragePath(), chatflowid, chatId)
                deleteFolderRecursive(directory)
            } catch (e) {
                logger.error(`[server]: Error deleting file storage for chatflow ${chatflowid}, chatId ${chatId}: ${e}`)
            }
        }
        const dbResponse = await appServer.AppDataSource.getRepository(ChatMessage).delete(deleteOptions)
        return dbResponse
    } catch (error) {
        throw new Error(`Error: chatMessagesService.removeAllChatMessages - ${error}`)
    }
}

export default {
    createChatMessage,
    getAllChatMessages,
    getAllInternalChatMessages,
    removeAllChatMessages
}
