import { ChatMessage } from '../database/entities/ChatMessage'
import { IChatFlow, IChatMessage } from '../Interface'
import { getRunningExpressApp } from '../utils/getRunningExpressApp'

/**
 * Method that add chat messages.
 * @param {Partial<IChatMessage>} chatMessage
 */
export const utilAddChatMessage = async (chatMessage: Partial<IChatMessage>, chatflow: IChatFlow | null = null): Promise<ChatMessage | null> => {
    const appServer = getRunningExpressApp()

    if (process.env.DISABLE_MESSAGE_SAVING === 'true'){
        return null
    }

    const newChatMessage = new ChatMessage()
    Object.assign(newChatMessage, chatMessage)
    if (!newChatMessage.createdDate) {
        newChatMessage.createdDate = new Date()
    }
    const chatmessage = await appServer.AppDataSource.getRepository(ChatMessage).create(newChatMessage)
    const dbResponse = await appServer.AppDataSource.getRepository(ChatMessage).save(chatmessage)
    return dbResponse
}
