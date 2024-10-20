import { Request, Response, NextFunction } from 'express'
import upsertHistoryService from '../../services/upsert-history'

const getAllUpsertHistory = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const sortOrder = req.query?.order as string | undefined
        const chatflowid = req.params?.id as string | undefined
        const startDate = req.query?.startDate as string | undefined
        const endDate = req.query?.endDate as string | undefined
        const apiResponse = await upsertHistoryService.getAllUpsertHistory(sortOrder, chatflowid, startDate, endDate)
        return res.json(apiResponse)
    } catch (error) {
        next(error)
    }
}

const patchDeleteUpsertHistory = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const ids = req.body.ids ?? []
        const apiResponse = await upsertHistoryService.patchDeleteUpsertHistory(ids)
        return res.json(apiResponse)
    } catch (error) {
        next(error)
    }
}

export default {
    getAllUpsertHistory,
    patchDeleteUpsertHistory
}
