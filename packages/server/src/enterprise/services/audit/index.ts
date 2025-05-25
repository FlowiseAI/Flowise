import { getRunningExpressApp } from '../../../utils/getRunningExpressApp'
import { LoginActivity } from '../../database/entities/EnterpriseEntities'
import { InternalFlowiseError } from '../../../errors/internalFlowiseError'
import { StatusCodes } from 'http-status-codes'
import { getErrorMessage } from '../../../errors/utils'
import { Between, In } from 'typeorm'
import { LoginActivityCode } from '../../Interface.Enterprise'
import { Platform } from '../../../Interface'

const PAGE_SIZE = 10

const aMonthAgo = () => {
    const date = new Date()
    date.setMonth(new Date().getMonth() - 1)
    return date
}

const setDateToStartOrEndOfDay = (dateTimeStr: string, setHours: 'start' | 'end') => {
    const date = new Date(dateTimeStr)
    if (isNaN(date.getTime())) {
        return undefined
    }
    setHours === 'start' ? date.setHours(0, 0, 0, 0) : date.setHours(23, 59, 59, 999)
    return date
}

const fetchLoginActivity = async (body: any) => {
    try {
        const page = body.pageNo ? parseInt(body.pageNo) : 1
        const skip = (page - 1) * PAGE_SIZE
        const take = PAGE_SIZE
        const appServer = getRunningExpressApp()

        let fromDate
        if (body.startDate) fromDate = setDateToStartOrEndOfDay(body.startDate, 'start')

        let toDate
        if (body.endDate) toDate = setDateToStartOrEndOfDay(body.endDate, 'end')

        const whereCondition: any = {
            attemptedDateTime: Between(fromDate ?? aMonthAgo(), toDate ?? new Date())
        }
        if (body.activityCodes && body.activityCodes?.length > 0) {
            whereCondition['activityCode'] = In(body.activityCodes)
        }
        const count = await appServer.AppDataSource.getRepository(LoginActivity).count({
            where: whereCondition
        })
        const pagedResults = await appServer.AppDataSource.getRepository(LoginActivity).find({
            where: whereCondition,
            order: {
                attemptedDateTime: 'DESC'
            },
            skip,
            take
        })
        return {
            data: pagedResults,
            count: count,
            currentPage: page,
            pageSize: PAGE_SIZE
        }
    } catch (error) {
        throw new InternalFlowiseError(
            StatusCodes.INTERNAL_SERVER_ERROR,
            `Error: auditService.getLoginActivity - ${getErrorMessage(error)}`
        )
    }
}

const recordLoginActivity = async (username: string, activityCode: LoginActivityCode, message: string, ssoProvider?: string) => {
    try {
        const appServer = getRunningExpressApp()
        const platform = appServer.identityManager.getPlatformType()
        if (platform !== Platform.ENTERPRISE) {
            return
        }
        const loginMode = ssoProvider ?? 'Email/Password'
        const loginActivity = appServer.AppDataSource.getRepository(LoginActivity).create({
            username,
            activityCode,
            message,
            loginMode
        })
        const result = await appServer.AppDataSource.getRepository(LoginActivity).save(loginActivity)
        return result
    } catch (error) {
        throw new InternalFlowiseError(StatusCodes.INTERNAL_SERVER_ERROR, `Error: authService.loginActivity - ${getErrorMessage(error)}`)
    }
}

const deleteLoginActivity = async (body: any) => {
    try {
        const appServer = getRunningExpressApp()

        await appServer.AppDataSource.getRepository(LoginActivity).delete({
            id: In(body.selected)
        })
        return 'OK'
    } catch (error) {
        throw new InternalFlowiseError(StatusCodes.INTERNAL_SERVER_ERROR, `Error: authService.loginActivity - ${getErrorMessage(error)}`)
    }
}

export default {
    recordLoginActivity,
    deleteLoginActivity,
    fetchLoginActivity
}
