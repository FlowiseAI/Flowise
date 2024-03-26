import { ChatMessage } from '../database/entities/ChatMessage'
import { IChatMessage } from '../Interface'
import { getRunningExpressApp } from '../utils/getRunningExpressApp'

/**
 * Method that add chat messages.
 * @param {Partial<IChatMessage>} chatMessage
 */
export const utilAddChatMessage = async (chatMessage: Partial<IChatMessage>): Promise<ChatMessage> => {
    const flowXpresApp = getRunningExpressApp()
    const newChatMessage = new ChatMessage()
    Object.assign(newChatMessage, chatMessage)
    if (!newChatMessage.createdDate) {
        newChatMessage.createdDate = new Date()
    }
    const chatmessage = await flowXpresApp.AppDataSource.getRepository(ChatMessage).create(newChatMessage)
    const dbResponse = await flowXpresApp.AppDataSource.getRepository(ChatMessage).save(chatmessage)
    return dbResponse
}
