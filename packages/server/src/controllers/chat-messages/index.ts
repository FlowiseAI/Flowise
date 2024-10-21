import { Request, Response, NextFunction } from 'express'
import { ChatMessageRatingType, ChatType, IReactFlowObject } from '../../Interface'
import chatflowsService from '../../services/chatflows'
import chatMessagesService from '../../services/chat-messages'
import { aMonthAgo, clearSessionMemory, setDateToStartOrEndOfDay } from '../../utils'
import { getRunningExpressApp } from '../../utils/getRunningExpressApp'
import { Between, FindOptionsWhere } from 'typeorm'
import { ChatMessage } from '../../database/entities/ChatMessage'
import { InternalFlowiseError } from '../../errors/internalFlowiseError'
import { StatusCodes } from 'http-status-codes'
import { utilGetChatMessage } from '../../utils/getChatMessage'

const getFeedbackTypeFilters = (_feedbackTypeFilters: ChatMessageRatingType[]): ChatMessageRatingType[] | undefined => {
    try {
        let feedbackTypeFilters
        const feedbackTypeFilterArray = JSON.parse(JSON.stringify(_feedbackTypeFilters))
        if (
            feedbackTypeFilterArray.includes(ChatMessageRatingType.THUMBS_UP) &&
            feedbackTypeFilterArray.includes(ChatMessageRatingType.THUMBS_DOWN)
        ) {
            feedbackTypeFilters = [ChatMessageRatingType.THUMBS_UP, ChatMessageRatingType.THUMBS_DOWN]
        } else if (feedbackTypeFilterArray.includes(ChatMessageRatingType.THUMBS_UP)) {
            feedbackTypeFilters = [ChatMessageRatingType.THUMBS_UP]
        } else if (feedbackTypeFilterArray.includes(ChatMessageRatingType.THUMBS_DOWN)) {
            feedbackTypeFilters = [ChatMessageRatingType.THUMBS_DOWN]
        } else {
            feedbackTypeFilters = undefined
        }
        return feedbackTypeFilters
    } catch (e) {
        return _feedbackTypeFilters
    }
}

const createChatMessage = async (req: Request, res: Response, next: NextFunction) => {
    try {
        if (!req.body) {
            throw new InternalFlowiseError(
                StatusCodes.PRECONDITION_FAILED,
                'Error: chatMessagesController.createChatMessage - request body not provided!'
            )
        }
        const apiResponse = await chatMessagesService.createChatMessage(req.body)
        return res.json(parseAPIResponse(apiResponse))
    } catch (error) {
        next(error)
    }
}

const getAllChatMessages = async (req: Request, res: Response, next: NextFunction) => {
    try {
        let chatTypeFilter = req.query?.chatType as ChatType | undefined
        if (chatTypeFilter) {
            try {
                const chatTypeFilterArray = JSON.parse(chatTypeFilter)
                if (chatTypeFilterArray.includes(ChatType.EXTERNAL) && chatTypeFilterArray.includes(ChatType.INTERNAL)) {
                    chatTypeFilter = undefined
                } else if (chatTypeFilterArray.includes(ChatType.EXTERNAL)) {
                    chatTypeFilter = ChatType.EXTERNAL
                } else if (chatTypeFilterArray.includes(ChatType.INTERNAL)) {
                    chatTypeFilter = ChatType.INTERNAL
                }
            } catch (e) {
                return res.status(500).send(e)
            }
        }
        const sortOrder = req.query?.order as string | undefined
        const chatId = req.query?.chatId as string | undefined
        const memoryType = req.query?.memoryType as string | undefined
        const sessionId = req.query?.sessionId as string | undefined
        const messageId = req.query?.messageId as string | undefined
        const startDate = req.query?.startDate as string | undefined
        const endDate = req.query?.endDate as string | undefined
        const feedback = req.query?.feedback as boolean | undefined
        let feedbackTypeFilters = req.query?.feedbackType as ChatMessageRatingType[] | undefined
        if (feedbackTypeFilters) {
            feedbackTypeFilters = getFeedbackTypeFilters(feedbackTypeFilters)
        }
        if (typeof req.params === 'undefined' || !req.params.id) {
            throw new InternalFlowiseError(
                StatusCodes.PRECONDITION_FAILED,
                `Error: chatMessageController.getAllChatMessages - id not provided!`
            )
        }
        const apiResponse = await chatMessagesService.getAllChatMessages(
            req.params.id,
            chatTypeFilter,
            sortOrder,
            chatId,
            memoryType,
            sessionId,
            startDate,
            endDate,
            messageId,
            feedback,
            feedbackTypeFilters
        )

        return res.json(parseAPIResponse(apiResponse))
    } catch (error) {
        next(error)
    }
}

const getAllInternalChatMessages = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const sortOrder = req.query?.order as string | undefined
        const chatId = req.query?.chatId as string | undefined
        const memoryType = req.query?.memoryType as string | undefined
        const sessionId = req.query?.sessionId as string | undefined
        const messageId = req.query?.messageId as string | undefined
        const startDate = req.query?.startDate as string | undefined
        const endDate = req.query?.endDate as string | undefined
        const feedback = req.query?.feedback as boolean | undefined
        let feedbackTypeFilters = req.query?.feedbackType as ChatMessageRatingType[] | undefined
        if (feedbackTypeFilters) {
            feedbackTypeFilters = getFeedbackTypeFilters(feedbackTypeFilters)
        }
        const apiResponse = await chatMessagesService.getAllInternalChatMessages(
            req.params.id,
            ChatType.INTERNAL,
            sortOrder,
            chatId,
            memoryType,
            sessionId,
            startDate,
            endDate,
            messageId,
            feedback,
            feedbackTypeFilters
        )
        return res.json(parseAPIResponse(apiResponse))
    } catch (error) {
        next(error)
    }
}

const removeAllChatMessages = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const appServer = getRunningExpressApp()
        if (typeof req.params === 'undefined' || !req.params.id) {
            throw new InternalFlowiseError(
                StatusCodes.PRECONDITION_FAILED,
                'Error: chatMessagesController.removeAllChatMessages - id not provided!'
            )
        }
        const chatflowid = req.params.id
        const chatflow = await chatflowsService.getChatflowById(req.params.id)
        if (!chatflow) {
            return res.status(404).send(`Chatflow ${req.params.id} not found`)
        }
        const flowData = chatflow.flowData
        const parsedFlowData: IReactFlowObject = JSON.parse(flowData)
        const nodes = parsedFlowData.nodes
        const chatId = req.query?.chatId as string
        const memoryType = req.query?.memoryType as string | undefined
        const sessionId = req.query?.sessionId as string | undefined
        const _chatType = req.query?.chatType as string | undefined
        const startDate = req.query?.startDate as string | undefined
        const endDate = req.query?.endDate as string | undefined
        const isClearFromViewMessageDialog = req.query?.isClearFromViewMessageDialog as string | undefined
        let feedbackTypeFilters = req.query?.feedbackType as ChatMessageRatingType[] | undefined
        if (feedbackTypeFilters) {
            feedbackTypeFilters = getFeedbackTypeFilters(feedbackTypeFilters)
        }

        if (!chatId) {
            const isFeedback = feedbackTypeFilters?.length ? true : false
            const hardDelete = req.query?.hardDelete as boolean | undefined
            const messages = await utilGetChatMessage(
                chatflowid,
                _chatType as ChatType | undefined,
                undefined,
                undefined,
                undefined,
                undefined,
                startDate,
                endDate,
                undefined,
                isFeedback,
                feedbackTypeFilters
            )
            const messageIds = messages.map((message) => message.id)

            // Categorize by chatId_memoryType_sessionId
            const chatIdMap = new Map<string, ChatMessage[]>()
            messages.forEach((message) => {
                const chatId = message.chatId
                const memoryType = message.memoryType
                const sessionId = message.sessionId
                const composite_key = `${chatId}_${memoryType}_${sessionId}`
                if (!chatIdMap.has(composite_key)) {
                    chatIdMap.set(composite_key, [])
                }
                chatIdMap.get(composite_key)?.push(message)
            })

            // If hardDelete is ON, we clearSessionMemory from third party integrations
            if (hardDelete) {
                for (const [composite_key] of chatIdMap) {
                    const [chatId, memoryType, sessionId] = composite_key.split('_')
                    try {
                        await clearSessionMemory(
                            nodes,
                            appServer.nodesPool.componentNodes,
                            chatId,
                            appServer.AppDataSource,
                            sessionId,
                            memoryType,
                            isClearFromViewMessageDialog
                        )
                    } catch (e) {
                        console.error('Error clearing chat messages')
                    }
                }
            }

            const apiResponse = await chatMessagesService.removeChatMessagesByMessageIds(chatflowid, chatIdMap, messageIds)
            return res.json(apiResponse)
        } else {
            try {
                await clearSessionMemory(
                    nodes,
                    appServer.nodesPool.componentNodes,
                    chatId,
                    appServer.AppDataSource,
                    sessionId,
                    memoryType,
                    isClearFromViewMessageDialog
                )
            } catch (e) {
                return res.status(500).send('Error clearing chat messages')
            }

            const deleteOptions: FindOptionsWhere<ChatMessage> = { chatflowid }
            if (chatId) deleteOptions.chatId = chatId
            if (memoryType) deleteOptions.memoryType = memoryType
            if (sessionId) deleteOptions.sessionId = sessionId
            if (_chatType) deleteOptions.chatType = _chatType
            if (startDate && endDate) {
                const fromDate = setDateToStartOrEndOfDay(startDate, 'start')
                const toDate = setDateToStartOrEndOfDay(endDate, 'end')
                deleteOptions.createdDate = Between(fromDate ?? aMonthAgo(), toDate ?? new Date())
            }
            const apiResponse = await chatMessagesService.removeAllChatMessages(chatId, chatflowid, deleteOptions)
            return res.json(apiResponse)
        }
    } catch (error) {
        next(error)
    }
}

const abortChatMessage = async (req: Request, res: Response, next: NextFunction) => {
    try {
        if (typeof req.params === 'undefined' || !req.params.chatflowid || !req.params.chatid) {
            throw new InternalFlowiseError(
                StatusCodes.PRECONDITION_FAILED,
                `Error: chatMessagesController.abortChatMessage - chatflowid or chatid not provided!`
            )
        }
        await chatMessagesService.abortChatMessage(req.params.chatid, req.params.chatflowid)
        return res.json({ status: 200, message: 'Chat message aborted' })
    } catch (error) {
        next(error)
    }
}

const parseAPIResponse = (apiResponse: ChatMessage | ChatMessage[]): ChatMessage | ChatMessage[] => {
    const parseResponse = (response: ChatMessage): ChatMessage => {
        const parsedResponse = { ...response }

        if (parsedResponse.sourceDocuments) {
            parsedResponse.sourceDocuments = JSON.parse(parsedResponse.sourceDocuments)
        }
        if (parsedResponse.usedTools) {
            parsedResponse.usedTools = JSON.parse(parsedResponse.usedTools)
        }
        if (parsedResponse.fileAnnotations) {
            parsedResponse.fileAnnotations = JSON.parse(parsedResponse.fileAnnotations)
        }
        if (parsedResponse.agentReasoning) {
            parsedResponse.agentReasoning = JSON.parse(parsedResponse.agentReasoning)
        }
        if (parsedResponse.fileUploads) {
            parsedResponse.fileUploads = JSON.parse(parsedResponse.fileUploads)
        }
        if (parsedResponse.action) {
            parsedResponse.action = JSON.parse(parsedResponse.action)
        }
        if (parsedResponse.artifacts) {
            parsedResponse.artifacts = JSON.parse(parsedResponse.artifacts)
        }

        return parsedResponse
    }

    if (Array.isArray(apiResponse)) {
        return apiResponse.map(parseResponse)
    } else {
        return parseResponse(apiResponse)
    }
}

export default {
    createChatMessage,
    getAllChatMessages,
    getAllInternalChatMessages,
    removeAllChatMessages,
    abortChatMessage
}
