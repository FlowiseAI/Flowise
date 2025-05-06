import { StatusCodes } from 'http-status-codes'
import { IUser, AppCsvParseRunsStatus } from '../../Interface'
import { getRunningExpressApp } from '../../utils/getRunningExpressApp'
import { InternalFlowiseError } from '../../errors/internalFlowiseError'
import { getErrorMessage } from '../../errors/utils'
import { AppCsvParseRuns } from '../../database/entities/AppCsvParseRuns'

const getAllCsvParseRuns = async (user: IUser) => {
    try {
        const appServer = getRunningExpressApp()
        const csvParseRuns = await appServer.AppDataSource.getRepository(AppCsvParseRuns).find({
            where: {
                userId: user.id,
                organizationId: user.organizationId
            },
            order: {
                startedAt: 'DESC'
            }
        })
        return JSON.parse(JSON.stringify(csvParseRuns))
    } catch (error) {
        throw new InternalFlowiseError(
            StatusCodes.INTERNAL_SERVER_ERROR,
            `Error: csvParserService.getAllCsvParseRuns - ${getErrorMessage(error)}`
        )
    }
}

const getCsvParseRunById = async (csvParseRunId: string, user: IUser) => {
    try {
        const appServer = getRunningExpressApp()
        const csvParseRun = await appServer.AppDataSource.getRepository(AppCsvParseRuns).findOne({
            where: {
                id: csvParseRunId,
                userId: user.id,
                organizationId: user.organizationId
            }
        })

        if (!csvParseRun) {
            throw new InternalFlowiseError(StatusCodes.NOT_FOUND, `CsvParseRun ${csvParseRunId} not found`)
        }

        return JSON.parse(JSON.stringify(csvParseRun))
    } catch (error) {
        throw new InternalFlowiseError(
            StatusCodes.INTERNAL_SERVER_ERROR,
            `Error: csvParserService.getCsvParseRunById - ${getErrorMessage(error)}`
        )
    }
}

const createCsvParseRun = async (user: IUser, body: any) => {
    try {
        const appServer = getRunningExpressApp()
        const csvParseRun = await appServer.AppDataSource.getRepository(AppCsvParseRuns)
            .createQueryBuilder()
            .insert()
            .values({
                userId: user.id,
                organizationId: user.organizationId,
                name: body.name,
                configuration: body.configuration,
                originalCsvUrl: body.originalCsvUrl,
                chatflowChatId: body.chatflowChatId,
                rowsRequested: body.rowsRequested,
                includeOriginalColumns: body.includeOriginalColumns,
                startedAt: new Date(),
                status: AppCsvParseRunsStatus.PENDING,
                errorMessages: []
            })
            .execute()
        return JSON.parse(JSON.stringify(csvParseRun))
    } catch (error) {
        throw new InternalFlowiseError(
            StatusCodes.INTERNAL_SERVER_ERROR,
            `Error: csvParserService.createCsvParseRun - ${getErrorMessage(error)}`
        )
    }
}

export default {
    getAllCsvParseRuns,
    getCsvParseRunById,
    createCsvParseRun
}
