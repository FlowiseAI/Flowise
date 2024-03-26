import { ChatMessage } from '../database/entities/ChatMessage'
import { IChatMessage } from '../Interface'
import { getRunningExpressApp } from '../utils/getRunningExpressApp'

/**
 * Method that add chat messages.
 * @param {Partial<IChatMessage>} chatMessage
 */
export const addChatMessage = async (chatMessage: Partial<IChatMessage>): Promise<ChatMessage> => {
    const flowXpresApp = getRunningExpressApp()
    const newChatMessage = new ChatMessage()
    Object.assign(newChatMessage, chatMessage)
    const chatmessage = await flowXpresApp.AppDataSource.getRepository(ChatMessage).create(newChatMessage)
    return await flowXpresApp.AppDataSource.getRepository(ChatMessage).save(chatmessage)
}
