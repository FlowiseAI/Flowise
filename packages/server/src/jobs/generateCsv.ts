import cron from 'node-cron'
import { PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3'
import { parse } from 'csv-parse/sync'
import logger from '../utils/logger'
import { getRunningExpressApp } from '../utils/getRunningExpressApp'
import { AppCsvParseRunsStatus } from '../Interface'
import { AppCsvParseRuns } from '../database/entities/AppCsvParseRuns'
import { AppCsvParseRows } from '../database/entities/AppCsvParseRows'
import { getS3Config } from 'flowise-components'

/**
 * Cron job schedule for generating csv
 * Default: Every 15 minutes ('0/15 * * * *')
 */
const GENERATE_CSV_CRON_SCHEDULE = process.env.GENERATE_CSV_CRON_SCHEDULE || '*/30 * * * * *'

/**
 * Flag to enable/disable generating csv cron job
 * Default: true
 */
const ENABLE_GENERATE_CSV_CRON = process.env.ENABLE_GENERATE_CSV_CRON !== 'false'

const { s3Client } = getS3Config()

function convertToCSV<T extends object>(data: T[]): string {
    if (data.length === 0) {
        return ''
    }

    // Extract the keys from the first object to use as CSV headers
    const keys = Object.keys(data[0])

    // Create the CSV header row
    const header = keys.join(',')

    // Create rows by mapping through the array of objects
    const rows = data.map((row) => {
        return keys
            .map((key) => {
                // Convert undefined or null to empty strings
                const value = (row as Record<string, unknown>)[key] ?? ''
                // Escape quotes by replacing " with ""
                // Wrap fields containing commas or quotes in double quotes
                const stringValue = String(value).replace(/"/g, '""')
                return stringValue.includes(',') || stringValue.includes('"') ? `"${stringValue}"` : stringValue
            })
            .join(',')
    })

    // Combine header and rows
    return [header, ...rows].join('\n')
}

const generateCsv = async (csvParseRun: AppCsvParseRuns) => {
    try {
        // update csvParseRun with generatingCsv status
        const appServer = getRunningExpressApp()
        await appServer.AppDataSource.getRepository(AppCsvParseRuns)
            .createQueryBuilder()
            .update()
            .set({ status: AppCsvParseRunsStatus.GENERATING_CSV })
            .where('id = :id', { id: csvParseRun.id })
            .execute()

        // get all rows for this run in order
        const rows = await appServer.AppDataSource.getRepository(AppCsvParseRows)
            .createQueryBuilder('csvParseRows')
            .where('"csvParseRunId" = :csvParseRunId', { csvParseRunId: csvParseRun.id })
            .orderBy('"rowNumber"', 'ASC')
            .take(csvParseRun.rowsRequested > 0 ? csvParseRun.rowsRequested : undefined)
            .getMany()

        let records: Array<any> = []

        // if includeOriginalColumns is set to true, download original csv from S3
        if (csvParseRun.includeOriginalColumns) {
            const originalCsv = await s3Client.send(
                new GetObjectCommand({
                    Bucket: process.env.S3_STORAGE_BUCKET_NAME ?? '',
                    Key: csvParseRun.originalCsvUrl.replace(`s3://${process.env.S3_STORAGE_BUCKET_NAME ?? ''}/`, '')
                })
            )
            // Get the CSV content as string
            const originalCsvText = (await originalCsv.Body?.transformToString()) ?? ''

            // Parse the CSV content into records
            records = parse(originalCsvText, {
                columns: true,
                skip_empty_lines: true
            })
        }

        if (csvParseRun.rowsRequested > 0) {
            records = records.slice(0, csvParseRun.rowsRequested)
        }

        // generate csv from rows
        rows.forEach((row, index: number) => {
            records[index] = {
                ...records[index],
                ...(row.generatedData ?? {})
            }
        })

        // create csv from records
        const csv = convertToCSV(records)

        // save csv to S3
        const key = `s3://${process.env.S3_STORAGE_BUCKET_NAME ?? ''}/csv-parse-runs/${csvParseRun.organizationId}/${csvParseRun.id}.csv`
        await s3Client.send(
            new PutObjectCommand({
                Bucket: process.env.S3_STORAGE_BUCKET_NAME ?? '',
                Key: key,
                Body: csv
            })
        )

        // update csvParseRun with generatedCsvUrl
        await appServer.AppDataSource.getRepository(AppCsvParseRuns)
            .createQueryBuilder()
            .update()
            .set({ processedCsvUrl: key, status: AppCsvParseRunsStatus.READY, completedAt: new Date() })
            .where('id = :id', { id: csvParseRun.id })
            .execute()
    } catch (error) {
        logger.error('Error generating csv', error)
    }
}

const main = async () => {
    try {
        logger.info('start processing csv rows')

        // Get list of pending or inProgress Runs
        const appServer = getRunningExpressApp()
        const csvParseRuns = await appServer.AppDataSource.getRepository(AppCsvParseRuns)
            .createQueryBuilder('csvParseRuns')
            .where('status IN (:...statuses)', {
                statuses: [AppCsvParseRunsStatus.COMPLETE, AppCsvParseRunsStatus.COMPLETE_WITH_ERRORS]
            })
            .orderBy('"startedAt"', 'ASC')
            .take(1)
            .getMany()

        logger.info(`Found ${csvParseRuns.length} csv parse runs to generate csv`)

        // For each Run do
        const promises = csvParseRuns.map(generateCsv)
        const results = await Promise.allSettled(promises)

        results.forEach((result, index) => {
            if (result.status === 'fulfilled') {
                logger.info(`Run ${csvParseRuns[index].id} completed`)
            } else {
                logger.error(`Run ${csvParseRuns[index].id} failed`)
            }
        })
    } catch (err) {
        logger.error('❌ [cron]: Error running generate csv:', err)
    }
}

export default async function initJob() {
    if (ENABLE_GENERATE_CSV_CRON) {
        logger.info(`📅 [cron]: Initializing generate csv cron job with schedule: ${GENERATE_CSV_CRON_SCHEDULE}`)

        // Validate cron schedule
        if (!cron.validate(GENERATE_CSV_CRON_SCHEDULE)) {
            logger.error(`❌ [cron]: Invalid cron schedule for generate csv: ${GENERATE_CSV_CRON_SCHEDULE}`)
            return
        }
        // Schedule generate csv job
        cron.schedule(GENERATE_CSV_CRON_SCHEDULE, async () => {
            try {
                logger.info('📅 [cron]: Running generate csv job')
                await main()
            } catch (error) {
                logger.error('❌ [cron]: Error running generate csv:', error)
            }
        })
    } else {
        logger.info('📅 [cron]: Generate csv cron job is disabled')
    }
}
