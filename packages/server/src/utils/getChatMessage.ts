import { MoreThanOrEqual, LessThanOrEqual, Between, In } from 'typeorm'
import { ChatMessageRatingType, ChatType } from '../Interface'
import { ChatMessage } from '../database/entities/ChatMessage'
import { ChatMessageFeedback } from '../database/entities/ChatMessageFeedback'
import { ChatFlow } from '../database/entities/ChatFlow'
import { getRunningExpressApp } from '../utils/getRunningExpressApp'

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
    page = -1,
    pageSize = -1
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
        // Handle feedback queries with improved efficiency
        return await handleFeedbackQuery({
            chatflowid,
            chatTypes,
            sortOrder,
            chatId,
            memoryType,
            sessionId,
            startDate,
            endDate,
            messageId,
            feedbackTypes,
            page,
            pageSize
        })
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

async function handleFeedbackQuery(params: {
    chatflowid: string
    chatTypes?: ChatType[]
    sortOrder: string
    chatId?: string
    memoryType?: string
    sessionId?: string
    startDate?: string
    endDate?: string
    messageId?: string
    feedbackTypes?: ChatMessageRatingType[]
    page: number
    pageSize: number
}): Promise<ChatMessage[]> {
    const {
        chatflowid,
        chatTypes,
        sortOrder,
        chatId,
        memoryType,
        sessionId,
        startDate,
        endDate,
        messageId,
        feedbackTypes,
        page,
        pageSize
    } = params

    const appServer = getRunningExpressApp()

    // For specific session/message queries, no pagination needed
    if (sessionId || messageId) {
        return await getMessagesWithFeedback(params, false)
    }

    // For paginated queries, handle session-based pagination efficiently
    if (page > -1 && pageSize > -1) {
        // First get session IDs with pagination
        const sessionQuery = appServer.AppDataSource.getRepository(ChatMessage)
            .createQueryBuilder('chat_message')
            .select('chat_message.sessionId', 'sessionId')
            .where('chat_message.chatflowid = :chatflowid', { chatflowid })

        // Apply basic filters
        if (chatTypes && chatTypes.length > 0) {
            sessionQuery.andWhere('chat_message.chatType IN (:...chatTypes)', { chatTypes })
        }
        if (chatId) {
            sessionQuery.andWhere('chat_message.chatId = :chatId', { chatId })
        }
        if (memoryType) {
            sessionQuery.andWhere('chat_message.memoryType = :memoryType', { memoryType })
        }
        if (startDate && typeof startDate === 'string') {
            sessionQuery.andWhere('chat_message.createdDate >= :startDateTime', {
                startDateTime: new Date(startDate)
            })
        }
        if (endDate && typeof endDate === 'string') {
            sessionQuery.andWhere('chat_message.createdDate <= :endDateTime', {
                endDateTime: new Date(endDate)
            })
        }

        // If feedback types are specified, only get sessions with those feedback types
        if (feedbackTypes && feedbackTypes.length > 0) {
            sessionQuery
                .leftJoin(ChatMessageFeedback, 'feedback', 'feedback.messageId = chat_message.id')
                .andWhere('feedback.rating IN (:...feedbackTypes)', { feedbackTypes })
        }

        const startIndex = pageSize * (page - 1)
        const sessionIds = await sessionQuery
            .orderBy('MAX(chat_message.createdDate)', sortOrder === 'DESC' ? 'DESC' : 'ASC')
            .groupBy('chat_message.sessionId')
            .offset(startIndex)
            .limit(pageSize)
            .getRawMany()

        if (sessionIds.length === 0) {
            return []
        }

        // Get all messages for these sessions
        const sessionIdList = sessionIds.map((s) => s.sessionId)
        return await getMessagesWithFeedback(
            {
                ...params,
                sessionId: undefined // Clear specific sessionId since we're using list
            },
            true,
            sessionIdList
        )
    }

    // No pagination - get all feedback messages
    return await getMessagesWithFeedback(params, false)
}

async function getMessagesWithFeedback(
    params: {
        chatflowid: string
        chatTypes?: ChatType[]
        sortOrder: string
        chatId?: string
        memoryType?: string
        sessionId?: string
        startDate?: string
        endDate?: string
        messageId?: string
        feedbackTypes?: ChatMessageRatingType[]
    },
    useSessionList: boolean = false,
    sessionIdList?: string[]
): Promise<ChatMessage[]> {
    const { chatflowid, chatTypes, sortOrder, chatId, memoryType, sessionId, startDate, endDate, messageId, feedbackTypes } = params

    const appServer = getRunningExpressApp()
    const query = appServer.AppDataSource.getRepository(ChatMessage).createQueryBuilder('chat_message')

    query
        .leftJoinAndSelect('chat_message.execution', 'execution')
        .leftJoinAndMapOne('chat_message.feedback', ChatMessageFeedback, 'feedback', 'feedback.messageId = chat_message.id')
        .where('chat_message.chatflowid = :chatflowid', { chatflowid })

    // Apply filters
    if (useSessionList && sessionIdList && sessionIdList.length > 0) {
        query.andWhere('chat_message.sessionId IN (:...sessionIds)', { sessionIds: sessionIdList })
    }

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
    if (startDate && typeof startDate === 'string') {
        query.andWhere('chat_message.createdDate >= :startDateTime', {
            startDateTime: new Date(startDate)
        })
    }
    if (endDate && typeof endDate === 'string') {
        query.andWhere('chat_message.createdDate <= :endDateTime', {
            endDateTime: new Date(endDate)
        })
    }

    // Pre-filter by feedback types if specified (more efficient than post-processing)
    if (feedbackTypes && feedbackTypes.length > 0) {
        query.andWhere('(feedback.rating IN (:...feedbackTypes) OR feedback.rating IS NULL)', { feedbackTypes })
    }

    query.orderBy('chat_message.createdDate', sortOrder === 'DESC' ? 'DESC' : 'ASC')

    const messages = (await query.getMany()) as Array<ChatMessage & { feedback: ChatMessageFeedback }>

    // Apply feedback type filtering with previous message inclusion
    if (feedbackTypes && feedbackTypes.length > 0) {
        return filterMessagesWithFeedback(messages, feedbackTypes)
    }

    return messages
}

function filterMessagesWithFeedback(
    messages: Array<ChatMessage & { feedback: ChatMessageFeedback }>,
    feedbackTypes: ChatMessageRatingType[]
): ChatMessage[] {
    // Group messages by session for proper filtering
    const sessionGroups = new Map<string, Array<ChatMessage & { feedback: ChatMessageFeedback }>>()

    messages.forEach((message) => {
        const sessionId = message.sessionId
        if (!sessionId) return // Skip messages without sessionId

        if (!sessionGroups.has(sessionId)) {
            sessionGroups.set(sessionId, [])
        }
        sessionGroups.get(sessionId)!.push(message)
    })

    const result: ChatMessage[] = []

    // Process each session group
    sessionGroups.forEach((sessionMessages) => {
        // Sort by creation date to ensure proper order
        sessionMessages.sort((a, b) => new Date(a.createdDate).getTime() - new Date(b.createdDate).getTime())

        const toInclude = new Set<number>()

        sessionMessages.forEach((message, index) => {
            if (message.role === 'apiMessage' && message.feedback && feedbackTypes.includes(message.feedback.rating)) {
                // Include the feedback message
                toInclude.add(index)
                // Include the previous message (user message) if it exists
                if (index > 0) {
                    toInclude.add(index - 1)
                }
            }
        })

        // Add filtered messages to result
        sessionMessages.forEach((message, index) => {
            if (toInclude.has(index)) {
                result.push(message)
            }
        })
    })

    // Sort final result by creation date
    return result.sort((a, b) => new Date(a.createdDate).getTime() - new Date(b.createdDate).getTime())
}
