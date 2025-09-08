import cron from 'node-cron'
import { PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3'
import { parse } from 'csv-parse/sync'
import logger from '../utils/logger'
import { getRunningExpressApp } from '../utils/getRunningExpressApp'
import { AppCsvParseRunsStatus } from '../Interface'
import { AppCsvParseRuns } from '../database/entities/AppCsvParseRuns'
import { AppCsvParseRows } from '../database/entities/AppCsvParseRows'
import { getS3Config } from 'flowise-components'
import { generateColumnName } from '../utils/csvUtils'

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
    const appServer = getRunningExpressApp()
    try {
        // update csvParseRun with generatingCsv status
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
            try {
                logger.info(`Downloading original CSV for run ${csvParseRun.id} to include original columns`)
                const originalCsv = await s3Client.send(
                    new GetObjectCommand({
                        Bucket: process.env.S3_STORAGE_BUCKET_NAME ?? '',
                        Key: csvParseRun.originalCsvUrl.replace(`s3://${process.env.S3_STORAGE_BUCKET_NAME ?? ''}/`, '')
                    })
                )
                // Get the CSV content as string
                const originalCsvText = (await originalCsv.Body?.transformToString()) ?? ''
                logger.info(`Original CSV downloaded, size: ${originalCsvText.length} characters`)

                // Use user's explicit decision about headers
                const userSpecifiedHeaders = (csvParseRun.configuration as any)?.firstRowIsHeaders || false
                logger.info(`Parsing original CSV with headers=${userSpecifiedHeaders}`)

                // Parse CSV using native csv-parse capability with more robust error handling
                let rawRecords: any
                try {
                    rawRecords = parse(originalCsvText, {
                        columns: userSpecifiedHeaders, // ✅ Use user decision directly
                        skip_empty_lines: true,
                        comment: '#',
                        comment_no_infix: true,
                        // Add more robust parsing options
                        quote: '"',
                        escape: '"',
                        relax_quotes: true,
                        relax_column_count: true
                    })
                    logger.info(
                        `CSV parsed successfully with ${
                            Array.isArray(rawRecords) ? rawRecords.length : Object.keys(rawRecords).length
                        } records`
                    )
                } catch (parseError) {
                    logger.warn(`Initial CSV parse failed, trying with more lenient options: ${parseError}`)
                    // Fallback to more lenient parsing
                    rawRecords = parse(originalCsvText, {
                        columns: userSpecifiedHeaders,
                        skip_empty_lines: true,
                        comment: '#',
                        comment_no_infix: true,
                        quote: '"',
                        escape: '"',
                        relax_quotes: true,
                        relax_column_count: true,
                        relax_column_count_more: true,
                        relax_column_count_less: true
                    })
                    logger.info(
                        `CSV parsed successfully with lenient options, ${
                            Array.isArray(rawRecords) ? rawRecords.length : Object.keys(rawRecords).length
                        } records`
                    )
                }

                if (userSpecifiedHeaders) {
                    // csv-parse already created objects with real headers
                    records = rawRecords as Record<string, string>[]
                } else {
                    // csv-parse returned arrays, create objects with generic column names
                    records = (rawRecords as string[][]).map((row: string[]) => {
                        const obj: Record<string, string> = {}
                        row.forEach((value, colIndex) => {
                            obj[generateColumnName(colIndex)] = value || ''
                        })
                        return obj
                    })
                }
                logger.info(`Processed ${records.length} records from original CSV`)
            } catch (originalCsvError) {
                logger.error(`Failed to process original CSV for run ${csvParseRun.id}:`, originalCsvError)
                // Continue without original columns rather than failing completely
                logger.info(`Continuing CSV generation without original columns due to parsing error`)
                records = []
            }
        }

        if (csvParseRun.rowsRequested > 0) {
            records = records.slice(0, csvParseRun.rowsRequested)
        }

        // generate csv from rows
        logger.info(`Merging AI-generated data from ${rows.length} processed rows`)
        rows.forEach((row, index: number) => {
            // Ensure we have a record to merge into
            if (!records[index]) {
                records[index] = {}
            }
            records[index] = {
                ...records[index],
                ...(row.generatedData ?? {})
            }
        })

        // If we don't have any original records but have generated data, create records from generated data only
        if (records.length === 0 && rows.length > 0) {
            logger.info('No original columns, creating CSV from AI-generated data only')
            records = rows.map((row) => row.generatedData ?? {})
        }

        logger.info(`Creating CSV from ${records.length} records`)

        // create csv from records
        const csv = convertToCSV(records)
        logger.info(`Generated CSV with ${csv.split('\n').length} lines`)

        // save csv to S3
        const s3Key = `csv-parse-runs/${csvParseRun.organizationId}/${csvParseRun.id}.csv`
        const fullS3Url = `s3://${process.env.S3_STORAGE_BUCKET_NAME ?? ''}/${s3Key}`

        logger.info(`Uploading generated CSV to S3: ${fullS3Url}`)
        await s3Client.send(
            new PutObjectCommand({
                Bucket: process.env.S3_STORAGE_BUCKET_NAME ?? '',
                Key: s3Key,
                Body: csv,
                ContentType: 'text/csv'
            })
        )
        logger.info(`CSV successfully uploaded to S3`)

        // update csvParseRun with generatedCsvUrl
        logger.info(`Updating CSV parse run ${csvParseRun.id} status to READY`)
        await appServer.AppDataSource.getRepository(AppCsvParseRuns)
            .createQueryBuilder()
            .update()
            .set({ processedCsvUrl: s3Key, status: AppCsvParseRunsStatus.READY, completedAt: new Date() })
            .where('id = :id', { id: csvParseRun.id })
            .execute()

        logger.info(`CSV generation completed successfully for run ${csvParseRun.id}`)
    } catch (error) {
        logger.error('Error generating csv', error)
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
