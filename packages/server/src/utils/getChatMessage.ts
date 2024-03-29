import { MoreThanOrEqual, LessThanOrEqual } from 'typeorm'
import { chatType } from '../Interface'
import { ChatMessage } from '../database/entities/ChatMessage'
import { ChatMessageFeedback } from '../database/entities/ChatMessageFeedback'
import { getRunningExpressApp } from '../utils/getRunningExpressApp'
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
 * @param {boolean} feedback
 */
export const utilGetChatMessage = async (
    chatflowid: string,
    chatType: chatType | undefined,
    sortOrder: string = 'ASC',
    chatId?: string,
    memoryType?: string,
    sessionId?: string,
    startDate?: string,
    endDate?: string,
    messageId?: string,
    feedback?: boolean
): Promise<ChatMessage[]> => {
    const appServer = getRunningExpressApp()
    const setDateToStartOrEndOfDay = (dateTimeStr: string, setHours: 'start' | 'end') => {
        const date = new Date(dateTimeStr)
        if (isNaN(date.getTime())) {
            return undefined
        }
        setHours === 'start' ? date.setHours(0, 0, 0, 0) : date.setHours(23, 59, 59, 999)
        return date
    }

    const aMonthAgo = () => {
        const date = new Date()
        date.setMonth(new Date().getMonth() - 1)
        return date
    }

    let fromDate
    if (startDate) fromDate = setDateToStartOrEndOfDay(startDate, 'start')

    let toDate
    if (endDate) toDate = setDateToStartOrEndOfDay(endDate, 'end')

    if (feedback) {
        const query = await appServer.AppDataSource.getRepository(ChatMessage).createQueryBuilder('chat_message')

        // do the join with chat message feedback based on messageId for each chat message in the chatflow
        query
            .leftJoinAndMapOne('chat_message.feedback', ChatMessageFeedback, 'feedback', 'feedback.messageId = chat_message.id')
            .where('chat_message.chatflowid = :chatflowid', { chatflowid })

        // based on which parameters are available add `andWhere` clauses to the query
        if (chatType) {
            query.andWhere('chat_message.chatType = :chatType', { chatType })
        }
        if (chatId) {
            query.andWhere('chat_message.chatId = :chatId', { chatId })
        }
        if (memoryType) {
            query.andWhere('chat_message.memoryType = :memoryType', { memoryType })
        }
        if (sessionId) {
            query.andWhere('chat_message.sessionId = :sessionId', { sessionId })
        }

        // set date range
        query.andWhere('chat_message.createdDate BETWEEN :fromDate AND :toDate', {
            fromDate: fromDate ?? aMonthAgo(),
            toDate: toDate ?? new Date()
        })
        // sort
        query.orderBy('chat_message.createdDate', sortOrder === 'DESC' ? 'DESC' : 'ASC')

        const messages = await query.getMany()
        return messages
    }

    return await appServer.AppDataSource.getRepository(ChatMessage).find({
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
