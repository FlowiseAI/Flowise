import { Request, Response, NextFunction } from 'express'
import { chatType } from '../../Interface'
import chatflowsService from '../../services/chatflows'
import chatMessagesService from '../../services/chat-messages'

// Add chatmessages for chatflowid
const createChatMessage = async (req: Request, res: Response, next: NextFunction) => {
    try {
        if (typeof req.body === 'undefined' || req.body === '') {
            throw new Error('Error: chatMessagesController.createChatMessage - request body not provided!')
        }
        const apiResponse = await chatMessagesService.createChatMessage(req.body)
        return res.json(apiResponse)
    } catch (error) {
        next(error)
    }
}

// Get all chatmessages from chatflowid
const getAllChatMessages = async (req: Request, res: Response, next: NextFunction) => {
    try {
        if (typeof req.params.id === 'undefined' || req.params.id === '') {
            throw new Error('Error: chatMessagesController.getAllChatMessages - id not provided!')
        }
        const sortOrder = req.query?.order as string | undefined
        const chatId = req.query?.chatId as string | undefined
        const memoryType = req.query?.memoryType as string | undefined
        const sessionId = req.query?.sessionId as string | undefined
        const messageId = req.query?.messageId as string | undefined
        const startDate = req.query?.startDate as string | undefined
        const endDate = req.query?.endDate as string | undefined
        let chatTypeFilter = req.query?.chatType as chatType | undefined
        if (chatTypeFilter) {
            try {
                const chatTypeFilterArray = JSON.parse(chatTypeFilter)
                if (chatTypeFilterArray.includes(chatType.EXTERNAL) && chatTypeFilterArray.includes(chatType.INTERNAL)) {
                    chatTypeFilter = undefined
                } else if (chatTypeFilterArray.includes(chatType.EXTERNAL)) {
                    chatTypeFilter = chatType.EXTERNAL
                } else if (chatTypeFilterArray.includes(chatType.INTERNAL)) {
                    chatTypeFilter = chatType.INTERNAL
                }
            } catch (e) {
                return res.status(500).send(e)
            }
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
            messageId
        )
        return res.json(apiResponse)
    } catch (error) {
        next(error)
    }
}

// Get internal chatmessages from chatflowid
const getAllInternalChatMessages = async (req: Request, res: Response, next: NextFunction) => {
    try {
        if (typeof req.params.id === 'undefined' || req.params.id === '') {
            throw new Error('Error: chatMessagesController.getAllInternalChatMessages - id not provided!')
        }
        const apiResponse = await chatMessagesService.getAllInternalChatMessages(req.params.id, chatType.INTERNAL)
        return res.json(apiResponse)
    } catch (error) {
        next(error)
    }
}

//Delete all chatmessages from chatId
const removeAllChatMessages = async (req: Request, res: Response, next: NextFunction) => {
    try {
        if (typeof req.params.id === 'undefined' || req.params.id === '') {
            throw new Error('Error: chatMessagesController.removeAllChatMessages - id not provided!')
        }
        const chatflowId = req.params.id
        const chatId = req.query?.chatId as string
        const chatType = req.query?.chatType as string | undefined
        const isClearFromViewMessageDialog = req.query?.isClearFromViewMessageDialog as string | undefined
        const memoryType = req.query?.memoryType as string | undefined
        const sessionId = req.query?.sessionId as string | undefined
        const apiResponse = await chatflowsService.removeAllChatMessages(
            chatflowId,
            chatId,
            chatType,
            isClearFromViewMessageDialog,
            memoryType,
            sessionId
        )
        if (typeof apiResponse.executionError !== 'undefined') {
            res.status(apiResponse.status).send(apiResponse.msg)
        }
        return res.json(apiResponse)
    } catch (error) {
        next(error)
    }
}

export default {
    createChatMessage,
    getAllChatMessages,
    getAllInternalChatMessages,
    removeAllChatMessages
}
