import { MoreThanOrEqual, LessThanOrEqual } from 'typeorm'
import { getRunningExpressApp } from '../../utils/getRunningExpressApp'
import { UpsertHistory } from '../../database/entities/UpsertHistory'

const getAllUpsertHistory = async (
    sortOrder: string | undefined,
    chatflowid: string | undefined,
    startDate: string | undefined,
    endDate: string | undefined
) => {
    try {
        const appServer = getRunningExpressApp()

        const setDateToStartOrEndOfDay = (dateTimeStr: string, setHours: 'start' | 'end') => {
            const date = new Date(dateTimeStr)
            if (isNaN(date.getTime())) {
                return undefined
            }
            setHours === 'start' ? date.setHours(0, 0, 0, 0) : date.setHours(23, 59, 59, 999)
            return date
        }

        let fromDate
        if (startDate) fromDate = setDateToStartOrEndOfDay(startDate, 'start')

        let toDate
        if (endDate) toDate = setDateToStartOrEndOfDay(endDate, 'end')

        let upsertHistory = await appServer.AppDataSource.getRepository(UpsertHistory).find({
            where: {
                chatflowid,
                ...(fromDate && { date: MoreThanOrEqual(fromDate) }),
                ...(toDate && { date: LessThanOrEqual(toDate) })
            },
            order: {
                date: sortOrder === 'DESC' ? 'DESC' : 'ASC'
            }
        })
        upsertHistory = upsertHistory.map((hist) => {
            return {
                ...hist,
                result: hist.result ? JSON.parse(hist.result) : {},
                flowData: hist.flowData ? JSON.parse(hist.flowData) : {}
            }
        })

        return upsertHistory
    } catch (error) {
        throw new Error(`Error: upsertHistoryServices.getAllUpsertHistory - ${error}`)
    }
}

const patchDeleteUpsertHistory = async (ids: string[] = []): Promise<any> => {
    try {
        const appServer = getRunningExpressApp()
        const dbResponse = await appServer.AppDataSource.getRepository(UpsertHistory).delete(ids)
        return dbResponse
    } catch (error) {
        throw new Error(`Error: upsertHistoryServices.patchUpsertHistory - ${error}`)
    }
}

export default {
    getAllUpsertHistory,
    patchDeleteUpsertHistory
}
