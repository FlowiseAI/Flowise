import { ChatMessageFeedback } from '../database/entities/ChatMessageFeedback'
import { IChatMessageFeedback } from '../Interface'
import { getRunningExpressApp } from '../utils/getRunningExpressApp'

/**
 * Method that add chat message feedback.
 * @param {Partial<IChatMessageFeedback>} chatMessageFeedback
 */

export const utilAddChatMessageFeedback = async (chatMessageFeedback: Partial<IChatMessageFeedback>): Promise<ChatMessageFeedback> => {
    const appServer = getRunningExpressApp()
    const newChatMessageFeedback = new ChatMessageFeedback()
    Object.assign(newChatMessageFeedback, chatMessageFeedback)
    const feedback = await appServer.AppDataSource.getRepository(ChatMessageFeedback).create(newChatMessageFeedback)
    return await appServer.AppDataSource.getRepository(ChatMessageFeedback).save(feedback)
}
