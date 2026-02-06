import { IChatMessageFeedback } from '../Interface'
import { getRunningExpressApp } from '../utils/getRunningExpressApp'
import { fetchAndMergeActiveVersion } from './getChatflowWithActiveVersion'
import { ChatMessageFeedback } from '../database/entities/ChatMessageFeedback'
import { ChatFlow } from '../database/entities/ChatFlow'
import lunary from 'lunary'

/**
 * Method that updates chat message feedback.
 * @param {string} id
 * @param {Partial<IChatMessageFeedback>} chatMessageFeedback
 */
export const utilUpdateChatMessageFeedback = async (id: string, chatMessageFeedback: Partial<IChatMessageFeedback>) => {
    const appServer = getRunningExpressApp()
    const newChatMessageFeedback = new ChatMessageFeedback()
    Object.assign(newChatMessageFeedback, chatMessageFeedback)

    await appServer.AppDataSource.getRepository(ChatMessageFeedback).update({ id }, chatMessageFeedback)

    // Fetch the updated entity
    const updatedFeedback = await appServer.AppDataSource.getRepository(ChatMessageFeedback).findOne({ where: { id } })

    const chatflow = await appServer.AppDataSource.getRepository(ChatFlow).findOne({ where: { id: updatedFeedback?.chatflowid } })

    // Get the active version's analytic config
    let analytic = JSON.parse(chatflow?.analytic ?? '{}')
    if (chatflow) {
        await fetchAndMergeActiveVersion(chatflow)
        if (chatflow.analytic) {
            analytic = JSON.parse(chatflow.analytic)
        }
    }

    if (analytic?.lunary?.status === true && updatedFeedback?.rating) {
        lunary.trackFeedback(updatedFeedback.messageId, {
            comment: updatedFeedback?.content,
            thumb: updatedFeedback?.rating === 'THUMBS_UP' ? 'up' : 'down'
        })
    }

    return { status: 'OK' }
}
