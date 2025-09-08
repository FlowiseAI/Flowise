import cron from 'node-cron'
import _ from 'lodash'
import { v4 as uuidv4 } from 'uuid'
import logger from '../utils/logger'
import { getRunningExpressApp } from '../utils/getRunningExpressApp'
import { executeFlow } from '../utils/buildChatflow'
import { AppCsvParseRunsStatus, AppCsvParseRowStatus, IAppCsvParseRuns, IAppCsvParseRows } from '../Interface'
import { AppCsvParseRuns } from '../database/entities/AppCsvParseRuns'
import { AppCsvParseRows } from '../database/entities/AppCsvParseRows'
import { ChatFlow } from '../database/entities/ChatFlow'
import { User } from '../database/entities/User'
import { safeParseCsvConfiguration } from '../types/csvTypes'
/**
 * Cron job schedule for processing csv rows
 * Default: Every 15 minutes ('0/15 * * * *')
 */
const PROCESS_CSV_ROWS_CRON_SCHEDULE = process.env.PROCESS_CSV_ROWS_CRON_SCHEDULE || '*/30 * * * * *'

/**
 * Flag to enable/disable processing csv rows cron job
 * Default: true
 */
const ENABLE_PROCESS_CSV_ROWS_CRON = process.env.ENABLE_PROCESS_CSV_ROWS_CRON !== 'false'

const CHUNK_SIZE = 5
const BATCH_SIZE = 10

const runChatFlow = async (row: IAppCsvParseRows, chatflowChatId: string) => {
    const appServer = getRunningExpressApp()
    const chatflow = await appServer.AppDataSource.getRepository(ChatFlow).findOneBy({
        id: chatflowChatId
    })
    if (!chatflow) {
        throw new Error(`Chatflow ${chatflowChatId} not found`)
    }
    const csvParseRun = await appServer.AppDataSource.getRepository(AppCsvParseRuns).findOneBy({
        id: row.csvParseRunId
    })
    if (!csvParseRun) {
        throw new Error(`CSV parse run ${row.csvParseRunId} not found`)
    }
    const user = await appServer.AppDataSource.getRepository(User).findOneBy({
        id: csvParseRun.userId
    })
    if (!user) {
        throw new Error(`User ${csvParseRun.userId} not found`)
    }

    // Build question from row data and optional run context - with type safety
    const { config: csvConfig } = safeParseCsvConfiguration(csvParseRun.configuration)
    const additionalContext = csvConfig?.context || ''
    const combinedQuestion = `### ${JSON.stringify(row.rowData)} ### ${additionalContext}`.trim()
    const response = await executeFlow({
        user: user,
        incomingInput: {
            question: combinedQuestion,
            user: user
        },
        chatflow,
        chatId: uuidv4(),
        baseURL: '',
        isInternal: true,
        appDataSource: appServer.AppDataSource,
        componentNodes: appServer.nodesPool.componentNodes,
        sseStreamer: appServer.sseStreamer,
        telemetry: appServer.telemetry,
        cachePool: appServer.cachePool
    })

    return response?.json
}

const processRow = async (row: IAppCsvParseRows, chatflowChatId: string): Promise<any> => {
    const appServer = getRunningExpressApp()
    try {
        logger.info(`Processing row ${row.id}`)
        await appServer.AppDataSource.getRepository(AppCsvParseRows)
            .createQueryBuilder()
            .update()
            .set({ status: AppCsvParseRowStatus.IN_PROGRESS })
            .where('id = :id', { id: row.id })
            .execute()
        // Call sidekick
        try {
            const result = await runChatFlow(row, chatflowChatId)
            // Store result on row, upsert rowData
            await appServer.AppDataSource.getRepository(AppCsvParseRows)
                .createQueryBuilder()
                .update()
                .set({ generatedData: result })
                .where('id = :id', { id: row.id })
                .execute()
            // Mark row as complete
            await appServer.AppDataSource.getRepository(AppCsvParseRows)
                .createQueryBuilder()
                .update()
                .set({ status: AppCsvParseRowStatus.COMPLETE })
                .where('id = :id', { id: row.id })
                .execute()
        } catch (err) {
            logger.error(`Error processing row ${row.id}`, err)
            await appServer.AppDataSource.getRepository(AppCsvParseRows)
                .createQueryBuilder()
                .update()
                .set({ status: AppCsvParseRowStatus.COMPLETE_WITH_ERRORS })
                .where('id = :id', { id: row.id })
                .execute()
        }
        return
    } catch (err) {
        logger.error(`Error processing row ${row.id}`, err)
        let errorMessage: string = ''
        if (err instanceof Error) {
            errorMessage = err.message
        }
        await appServer.AppDataSource.getRepository(AppCsvParseRows)
            .createQueryBuilder()
            .update()
            .set({ status: AppCsvParseRowStatus.COMPLETE_WITH_ERRORS, errorMessage })
            .where('id = :id', { id: row.id })
            .execute()
        throw err
    }
}

const parseCsvRun = async (csvParseRun: IAppCsvParseRuns): Promise<any> => {
    const appServer = getRunningExpressApp()
    try {
        logger.info(`Processing csv parse run ${csvParseRun.id}`)
        // mark run as inProgress
        if (csvParseRun.status === AppCsvParseRunsStatus.PENDING) {
            logger.info(`Updating run ${csvParseRun.id} to inProgress`)
            await appServer.AppDataSource.getRepository(AppCsvParseRuns)
                .createQueryBuilder()
                .update()
                .set({ status: AppCsvParseRunsStatus.IN_PROGRESS })
                .where('id = :id', { id: csvParseRun.id })
                .execute()
        }

        const rowsRequested = csvParseRun.rowsRequested ?? 0
        let rowsProcessed = csvParseRun.rowsProcessed ?? 0

        const count = await appServer.AppDataSource.getRepository(AppCsvParseRows)
            .createQueryBuilder('csvParseRows')
            .where('"csvParseRunId" = :csvParseRunId', { csvParseRunId: csvParseRun.id })
            .getCount()

        const inProgressRows = await appServer.AppDataSource.getRepository(AppCsvParseRows)
            .createQueryBuilder('csvParseRows')
            .where('"csvParseRunId" = :csvParseRunId', { csvParseRunId: csvParseRun.id })
            .andWhere('status = :status', { status: AppCsvParseRowStatus.IN_PROGRESS })
            .getCount()

        rowsProcessed += inProgressRows

        let rowsRemaining = rowsRequested - (rowsProcessed ?? 0)

        let limit = BATCH_SIZE
        if (rowsRequested > 0) {
            limit = Math.min(rowsRequested, limit, rowsRemaining)
        }

        if (limit <= 0) {
            logger.info(`No rows to process for run ${csvParseRun.id}, marking as complete`)
            await appServer.AppDataSource.getRepository(AppCsvParseRuns)
                .createQueryBuilder()
                .update()
                .set({ status: AppCsvParseRunsStatus.COMPLETE })
                .where('id = :id', { id: csvParseRun.id })
                .execute()
            return
        }

        const rows = await appServer.AppDataSource.getRepository(AppCsvParseRows)
            .createQueryBuilder('csvParseRows')
            .where('"csvParseRunId" = :csvParseRunId', { csvParseRunId: csvParseRun.id })
            .andWhere('status = :status', { status: AppCsvParseRowStatus.PENDING })
            .orderBy('"rowNumber"', 'ASC')
            .take(limit)
            .getMany()

        // If no rows, mark run as complete
        if (count === 0) {
            logger.info(`No pending rows for run ${csvParseRun.id}, marking as complete`)
            await appServer.AppDataSource.getRepository(AppCsvParseRuns)
                .createQueryBuilder()
                .update()
                .set({ status: AppCsvParseRunsStatus.COMPLETE })
                .where('id = :id', { id: csvParseRun.id })
                .execute()
            return
        }

        logger.info(`Found ${rowsRemaining} pending rows for run ${csvParseRun.id}`)

        // Create chunks of rows to process using lodash
        const chunks = _.chunk(rows, CHUNK_SIZE)
        logger.info(`Created ${chunks.length} chunks with a max of ${CHUNK_SIZE} rows each`)
        // Process chunks
        for (const chunk of chunks) {
            const promises = chunk.map((row) => processRow(row, csvParseRun.chatflowChatId))
            const results = await Promise.allSettled(promises)

            results.forEach((result, index) => {
                if (result.status === 'fulfilled') {
                    logger.info(`Row ${rows[index].id} completed`)
                } else {
                    logger.error(`Row ${rows[index].id} failed`)
                }
            })
        }

        if (count === rows.length || rowsRemaining === limit) {
            // if no more rows, mark run as complete
            await appServer.AppDataSource.getRepository(AppCsvParseRuns)
                .createQueryBuilder()
                .update()
                .set({ status: AppCsvParseRunsStatus.COMPLETE, rowsProcessed: (csvParseRun.rowsProcessed ?? 0) + rows.length })
                .where('id = :id', { id: csvParseRun.id })
                .execute()
        } else {
            // Update run with number of rows processed
            await appServer.AppDataSource.getRepository(AppCsvParseRuns)
                .createQueryBuilder()
                .update()
                .set({ rowsProcessed: (csvParseRun.rowsProcessed ?? 0) + rows.length })
                .where('id = :id', { id: csvParseRun.id })
                .execute()
        }
        return
    } catch (err) {
        logger.error(`Error processing run ${csvParseRun.id}`, err)
        let errorMessages: string[] = []
        if (err instanceof Error) {
            errorMessages.push(err.message)
        }
        await appServer.AppDataSource.getRepository(AppCsvParseRuns)
            .createQueryBuilder()
            .update()
            .set({ status: AppCsvParseRunsStatus.COMPLETE_WITH_ERRORS, errorMessages })
            .where('id = :id', { id: csvParseRun.id })
            .execute()
        throw err
    }
}

const main = async () => {
    try {
        logger.info('Start processing csv rows')

        // Get list of inProgress Runs
        const appServer = getRunningExpressApp()
        const csvParseRuns = await appServer.AppDataSource.getRepository(AppCsvParseRuns)
            .createQueryBuilder('csvParseRuns')
            .where('status = :status', { status: AppCsvParseRunsStatus.IN_PROGRESS })
            .orderBy('"startedAt"', 'ASC')
            .take(1)
            .getMany()

        logger.info(`Found ${csvParseRuns.length} csv parse runs to process`)

        // For each Run do
        const promises = csvParseRuns.map(parseCsvRun)
        const results = await Promise.allSettled(promises)

        results.forEach((result, index) => {
            if (result.status === 'fulfilled') {
                logger.info(`Run ${csvParseRuns[index].id} completed`)
            } else {
                logger.error(`Run ${csvParseRuns[index].id} failed`)
            }
        })
    } catch (err) {
        logger.error('❌ [cron]: Error running process csv rows:', err)
    }
}

export default async function initJob() {
    if (ENABLE_PROCESS_CSV_ROWS_CRON) {
        logger.info(`📅 [cron]: Initializing process csv rows cron job with schedule: ${PROCESS_CSV_ROWS_CRON_SCHEDULE}`)

        // Validate cron schedule
        if (!cron.validate(PROCESS_CSV_ROWS_CRON_SCHEDULE)) {
            logger.error(`❌ [cron]: Invalid cron schedule for process csv rows: ${PROCESS_CSV_ROWS_CRON_SCHEDULE}`)
            return
        }
        // Schedule process csv rows job
        cron.schedule(PROCESS_CSV_ROWS_CRON_SCHEDULE, async () => {
            try {
                logger.info('📅 [cron]: Running process csv rows job')
                await main()
            } catch (error) {
                logger.error('❌ [cron]: Error running process csv rows:', error)
            }
        })
    } else {
        logger.info('📅 [cron]: Process csv rows cron job is disabled')
    }
}
