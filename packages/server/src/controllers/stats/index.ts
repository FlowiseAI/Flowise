import { StatusCodes } from 'http-status-codes'
import { Request, Response, NextFunction } from 'express'
import statsService from '../../services/stats'
import { ChatMessageRatingType, ChatType } from '../../Interface'
import { InternalFlowiseError } from '../../errors/internalFlowiseError'
import { getErrorMessage } from '../../errors/utils'

const getChatflowStats = async (req: Request, res: Response, next: NextFunction) => {
    try {
        if (typeof req.params === 'undefined' || !req.params.id) {
            throw new InternalFlowiseError(StatusCodes.PRECONDITION_FAILED, `Error: statsController.getChatflowStats - id not provided!`)
        }
        const chatflowid = req.params.id
        let chatTypeFilter = req.query?.chatType as ChatType | undefined
        const startDate = req.query?.startDate as string | undefined
        const endDate = req.query?.endDate as string | undefined
        let feedbackTypeFilters = req.query?.feedbackType as ChatMessageRatingType[] | undefined
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
                throw new InternalFlowiseError(
                    StatusCodes.INTERNAL_SERVER_ERROR,
                    `Error: statsController.getChatflowStats - ${getErrorMessage(e)}`
                )
            }
        }
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
            chatTypeFilter,
            startDate,
            endDate,
            '',
            true,
            feedbackTypeFilters
        )
        return res.json(apiResponse)
    } catch (error) {
        next(error)
    }
}

export default {
    getChatflowStats
}
