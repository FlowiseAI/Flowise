import { MoreThanOrEqual, LessThanOrEqual, Between, In, IsNull, Not } from 'typeorm'
import { ChatMessageRatingType, ChatType } from '../Interface'
import { ChatMessage } from '../database/entities/ChatMessage'
import { ChatMessageFeedback } from '../database/entities/ChatMessageFeedback'
import { ChatFlow } from '../database/entities/ChatFlow'
import { getRunningExpressApp } from '../utils/getRunningExpressApp'
import { aMonthAgo } from '.'

/**
 * Method that get chat messages.
 * @param {string} chatflowid
 * @param {ChatType[]} chatTypes
 * @param {string} sortOrder
 * @param {string} chatId
 * @param {string} memoryType
 * @param {string} sessionId
 * @param {string} startDate
 * @param {string} endDate
 * @param {boolean} feedback
 * @param {ChatMessageRatingType[]} feedbackTypes
 */

interface GetChatMessageParams {
    chatflowid: string
    chatTypes?: ChatType[]
    sortOrder?: string
    chatId?: string
    memoryType?: string
    sessionId?: string
    startDate?: string
    endDate?: string
    messageId?: string
    feedback?: boolean
    feedbackTypes?: ChatMessageRatingType[]
    activeWorkspaceId?: string
    page?: number
    pageSize?: number
}

export const utilGetChatMessage = async ({
    chatflowid,
    chatTypes,
    sortOrder = 'ASC',
    chatId,
    memoryType,
    sessionId,
    startDate,
    endDate,
    messageId,
    feedback,
    feedbackTypes,
    activeWorkspaceId,
    page,
    pageSize
}: GetChatMessageParams): Promise<ChatMessage[]> => {
    if (!page) page = -1
    if (!pageSize) pageSize = -1

    const appServer = getRunningExpressApp()

    // Check if chatflow workspaceId is same as activeWorkspaceId
    if (activeWorkspaceId) {
        const chatflow = await appServer.AppDataSource.getRepository(ChatFlow).findOneBy({
            id: chatflowid,
            workspaceId: activeWorkspaceId
        })
        if (!chatflow) {
            throw new Error('Unauthorized access')
        }
    } else {
        throw new Error('Unauthorized access')
    }

    if (feedback) {
        const query = await appServer.AppDataSource.getRepository(ChatMessage).createQueryBuilder('chat_message')

        // do the join with chat message feedback based on messageId for each chat message in the chatflow
        query
            .leftJoinAndSelect('chat_message.execution', 'execution')
            .leftJoinAndMapOne('chat_message.feedback', ChatMessageFeedback, 'feedback', 'feedback.messageId = chat_message.id')
            .where('chat_message.chatflowid = :chatflowid', { chatflowid })

        // based on which parameters are available add `andWhere` clauses to the query
        if (chatTypes && chatTypes.length > 0) {
            query.andWhere('chat_message.chatType IN (:...chatTypes)', { chatTypes })
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
        if (messageId) {
            query.andWhere('chat_message.id = :messageId', { messageId })
        }

        // set date range
        if (startDate) {
            query.andWhere('chat_message.createdDate >= :startDateTime', { startDateTime: startDate ? new Date(startDate) : aMonthAgo() })
        }
        if (endDate) {
            query.andWhere('chat_message.createdDate <= :endDateTime', { endDateTime: endDate ? new Date(endDate) : new Date() })
        }
        // sort
        query.orderBy('chat_message.createdDate', sortOrder === 'DESC' ? 'DESC' : 'ASC')

        let messages = (await query.getMany()) as Array<ChatMessage & { feedback: ChatMessageFeedback }>
        if (messages.length > 0 && page > -1 && pageSize > -1 && !sessionId && !messageId) {
            const uniqueSessions = new Set(messages.map((message) => message.sessionId))
            const startIndex = pageSize * (page - 1)
            const endIndex = startIndex + pageSize
            const sessionIds = Array.from(uniqueSessions).slice(startIndex, endIndex)
            messages = messages.filter((message) => sessionIds.includes(message.sessionId))
        }
        if (feedbackTypes && feedbackTypes.length > 0) {
            // just applying a filter to the messages array will only return the messages that have feedback,
            // but we also want the message before the feedback message which is the user message.
            const indicesToKeep = new Set()

            messages.forEach((message, index) => {
                if (message.role === 'apiMessage' && message.feedback && feedbackTypes.includes(message.feedback.rating)) {
                    if (index > 0) indicesToKeep.add(index - 1)
                    indicesToKeep.add(index)
                }
            })

            return messages.filter((_, index) => indicesToKeep.has(index))
        }

        return messages
    }

    let createdDateQuery

    if (startDate || endDate) {
        if (startDate && endDate) {
            createdDateQuery = Between(new Date(startDate), new Date(endDate))
        } else if (startDate) {
            createdDateQuery = MoreThanOrEqual(new Date(startDate))
        } else if (endDate) {
            createdDateQuery = LessThanOrEqual(new Date(endDate))
        }
    }

    const messages = await appServer.AppDataSource.getRepository(ChatMessage).find({
        where: {
            chatflowid,
            chatType: chatTypes?.length ? In(chatTypes) : undefined,
            chatId,
            memoryType: memoryType ?? undefined,
            sessionId: sessionId ?? undefined,
            createdDate: createdDateQuery,
            id: messageId ?? undefined
        },
        relations: {
            execution: true
        },
        order: {
            createdDate: sortOrder === 'DESC' ? 'DESC' : 'ASC'
        }
    })

    return messages
}
