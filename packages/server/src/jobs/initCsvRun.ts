import cron from 'node-cron'
import { GetObjectCommand } from '@aws-sdk/client-s3'
import { parse } from 'csv-parse/sync'
import logger from '../utils/logger'
import { getRunningExpressApp } from '../utils/getRunningExpressApp'
import { AppCsvParseRunsStatus, AppCsvParseRowStatus, IAppCsvParseRuns } from '../Interface'
import { AppCsvParseRuns } from '../database/entities/AppCsvParseRuns'
import { AppCsvParseRows } from '../database/entities/AppCsvParseRows'
import { getS3Config } from 'flowise-components'
import { generateColumnName } from '../utils/csvUtils'

/**
 * Cron job schedule for initiliasing csv run
 * Default: Every 15 minutes ('0/15 * * * *')
 */
const INIT_CSV_RUN_CRON_SCHEDULE = process.env.INIT_CSV_RUN_CRON_SCHEDULE || '*/30 * * * * *'

/**
 * Flag to enable/disable initiliasing csv run cron job
 * Default: true
 */
const ENABLE_INIT_CSV_RUN_CRON = process.env.ENABLE_INIT_CSV_RUN_CRON !== 'false'

const { s3Client } = getS3Config()

const initCsvRun = async (csvParseRun: IAppCsvParseRuns) => {
    const appServer = getRunningExpressApp()
    try {
        // download csv from s3
        const bucketName = process.env.S3_STORAGE_BUCKET_NAME ?? ''
        const key = csvParseRun.originalCsvUrl.replace(`s3://${bucketName}/`, '')
        logger.info(`Downloading csv ${key} from s3 bucket ${bucketName}`)
        const originalCsv = await s3Client.send(
            new GetObjectCommand({
                Bucket: bucketName,
                Key: key
            })
        )
        // Get the CSV content as string
        const originalCsvText = (await originalCsv.Body?.transformToString()) ?? ''

        // Use user's explicit decision about headers
        const userSpecifiedHeaders = (csvParseRun.configuration as any)?.firstRowIsHeaders || false

        // Parse CSV using native csv-parse capability
        const records = parse(originalCsvText, {
            columns: userSpecifiedHeaders, // ✅ Use user decision directly
            skip_empty_lines: true,
            comment: '#',
            comment_no_infix: true
        })

        let processedRecords: Record<string, string>[] = []

        if (userSpecifiedHeaders) {
            // csv-parse already created objects with real headers
            processedRecords = records as Record<string, string>[]
        } else {
            // csv-parse returned arrays, create objects with generic column names
            processedRecords = (records as string[][]).map((row: string[]) => {
                const obj: Record<string, string> = {}
                row.forEach((value, colIndex) => {
                    obj[generateColumnName(colIndex)] = value || ''
                })
                return obj
            })
        }

        // create csv parse rows
        const csvParseRows = processedRecords.map((row: any, index: number) => {
            return {
                csvParseRunId: csvParseRun.id,
                rowNumber: index,
                rowData: row,
                status: AppCsvParseRowStatus.PENDING,
                createdAt: new Date(),
                updatedAt: new Date()
            }
        })

        // save csv parse rows
        await appServer.AppDataSource.getRepository(AppCsvParseRows).createQueryBuilder().insert().values(csvParseRows).execute()

        // update csv parse run status to inProgress
        await appServer.AppDataSource.getRepository(AppCsvParseRuns)
            .createQueryBuilder()
            .update()
            .set({ status: AppCsvParseRunsStatus.IN_PROGRESS })
            .where('id = :id', { id: csvParseRun.id })
            .execute()

        logger.info(`Csv run ${csvParseRun.id} initialized`)
    } catch (error) {
        logger.error(error)
        await appServer.AppDataSource.getRepository(AppCsvParseRuns)
            .createQueryBuilder()
            .update()
            .set({ status: AppCsvParseRunsStatus.COMPLETE_WITH_ERRORS, errorMessages: [String(error)] })
            .where('id = :id', { id: csvParseRun.id })
            .execute()
    }
}

const main = async () => {
    try {
        logger.info('Start processing csv rows')

        // Get list of inProgress Runs
        const appServer = getRunningExpressApp()
        const csvParseRuns = await appServer.AppDataSource.getRepository(AppCsvParseRuns)
            .createQueryBuilder('csvParseRuns')
            .where('status = :status', { status: AppCsvParseRunsStatus.PENDING })
            .orderBy('"startedAt"', 'ASC')
            .take(1)
            .getMany()

        logger.info(`Found ${csvParseRuns.length} pending csv parse runs`)
        // For each Run do
        const promises = csvParseRuns.map(initCsvRun)
        const results = await Promise.allSettled(promises)

        results.forEach((result, index) => {
            if (result.status === 'fulfilled') {
                logger.info(`Run ${csvParseRuns[index].id} completed`)
            } else {
                logger.error(`Run ${csvParseRuns[index].id} failed`)
            }
        })
    } catch (err) {
        logger.error('❌ [cron]: Error running init csv run:', err)
    }
}

export default async function initJob() {
    if (ENABLE_INIT_CSV_RUN_CRON) {
        logger.info(`📅 [cron]: Initializing init csv run cron job with schedule: ${INIT_CSV_RUN_CRON_SCHEDULE}`)

        // Validate cron schedule
        if (!cron.validate(INIT_CSV_RUN_CRON_SCHEDULE)) {
            logger.error(`❌ [cron]: Invalid cron schedule for init csv run: ${INIT_CSV_RUN_CRON_SCHEDULE}`)
            return
        }
        // Schedule init csv run job
        cron.schedule(INIT_CSV_RUN_CRON_SCHEDULE, async () => {
            try {
                logger.info('📅 [cron]: Running init csv run job')
                await main()
            } catch (error) {
                logger.error('❌ [cron]: Error running init csv run:', error)
            }
        })
    } else {
        logger.info('📅 [cron]: Initiliasing csv run cron job is disabled')
    }
}
