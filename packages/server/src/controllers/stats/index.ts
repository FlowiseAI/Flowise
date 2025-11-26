import { StatusCodes } from 'http-status-codes'
import { Request, Response, NextFunction } from 'express'
import statsService from '../../services/stats'
import { ChatMessageRatingType, ChatType } from '../../Interface'
import { InternalFlowiseError } from '../../errors/internalFlowiseError'

const getChatflowStats = async (req: Request, res: Response, next: NextFunction) => {
    try {
        if (typeof req.params === 'undefined' || !req.params.id) {
            throw new InternalFlowiseError(StatusCodes.PRECONDITION_FAILED, `Error: statsController.getChatflowStats - id not provided!`)
        }
        const chatflowid = req.params.id
        const _chatTypes = req.query?.chatType as string | undefined
        let chatTypes: ChatType[] | undefined
        if (_chatTypes) {
            try {
                if (Array.isArray(_chatTypes)) {
                    chatTypes = _chatTypes
                } else {
                    chatTypes = JSON.parse(_chatTypes)
                }
            } catch (e) {
                chatTypes = [_chatTypes as ChatType]
            }
        }
        const startDate = req.query?.startDate as string | undefined
        const endDate = req.query?.endDate as string | undefined
        let feedbackTypeFilters = req.query?.feedbackType as ChatMessageRatingType[] | undefined
        if (feedbackTypeFilters) {
            try {
                const feedbackTypeFilterArray = JSON.parse(JSON.stringify(feedbackTypeFilters))
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
            } catch (e) {
                return res.status(500).send(e)
            }
        }
        const apiResponse = await statsService.getChatflowStats(
            chatflowid,
            chatTypes,
            startDate,
            endDate,
            '',
            true,
            feedbackTypeFilters,
            req.user?.activeWorkspaceId
        )
        return res.json(apiResponse)
    } catch (error) {
        next(error)
    }
}

export default {
    getChatflowStats
}
