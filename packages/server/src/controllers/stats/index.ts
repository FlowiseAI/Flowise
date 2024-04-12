import { StatusCodes } from 'http-status-codes'
import { Request, Response, NextFunction } from 'express'
import statsService from '../../services/stats'
import { chatType } from '../../Interface'
import { InternalFlowiseError } from '../../errors/internalFlowiseError'
import { getErrorMessage } from '../../errors/utils'

const getChatflowStats = async (req: Request, res: Response, next: NextFunction) => {
    try {
        if (typeof req.params === 'undefined' || !req.params.id) {
            throw new InternalFlowiseError(StatusCodes.PRECONDITION_FAILED, `Error: statsController.getChatflowStats - id not provided!`)
        }
        const chatflowid = req.params.id
        let chatTypeFilter = req.query?.chatType as chatType | undefined
        const startDate = req.query?.startDate as string | undefined
        const endDate = req.query?.endDate as string | undefined
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
                throw new InternalFlowiseError(
                    StatusCodes.INTERNAL_SERVER_ERROR,
                    `Error: statsController.getChatflowStats - ${getErrorMessage(e)}`
                )
            }
        }
        const apiResponse = await statsService.getChatflowStats(chatflowid, chatTypeFilter, startDate, endDate, '', true)
        return res.json(apiResponse)
    } catch (error) {
        next(error)
    }
}

export default {
    getChatflowStats
}
