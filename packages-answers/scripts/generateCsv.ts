import { S3, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3'
import { parse } from 'csv-parse/sync'
import { AppCsvParseRuns } from '../db/generated/prisma-client'
import { prisma } from '../db/src/client'

const s3 = new S3({
    region: process.env.S3_STORAGE_REGION ?? 'us-east-1',
    credentials: {
        accessKeyId: process.env.S3_STORAGE_ACCESS_KEY_ID ?? '',
        secretAccessKey: process.env.S3_STORAGE_SECRET_ACCESS_KEY ?? ''
    }
})

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
        await prisma.appCsvParseRuns.update({
            where: { id: csvParseRun.id },
            data: { status: 'generatingCsv' }
        })

        // get all rows for this run in order
        const rows = await prisma.appCsvParseRows.findMany({
            where: {
                csvParseRunId: csvParseRun.id
            },
            orderBy: {
                rowNumber: 'asc'
            },
            take: csvParseRun.rowsRequested > 0 ? csvParseRun.rowsRequested : undefined
        })

        let records: Array<any> = []

        // if includeOriginalColumns is set to true, download original csv from S3
        if (csvParseRun.includeOriginalColumns) {
            const originalCsv = await s3.send(
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
        const key = `s3://${process.env.S3_STORAGE_BUCKET_NAME ?? ''}/csv-parse-runs/${csvParseRun.orgId}/${csvParseRun.id}.csv`
        await s3.send(
            new PutObjectCommand({
                Bucket: process.env.S3_STORAGE_BUCKET_NAME ?? '',
                Key: key,
                Body: csv
            })
        )

        // update csvParseRun with generatedCsvUrl
        await prisma.appCsvParseRuns.update({
            where: { id: csvParseRun.id },
            data: { processedCsvUrl: key, status: 'ready', completedAt: new Date() }
        })
    } catch (error) {
        console.error('Error generating csv', error)
    }
}

const main = async () => {
    try {
        console.log('start processing csv rows')

        // Get list of pending or inProgress Runs
        const csvParseRuns = await prisma.appCsvParseRuns.findMany({
            where: {
                status: {
                    in: ['complete', 'completeWithErrors']
                }
            },
            orderBy: {
                startedAt: 'asc'
            },
            take: 1
        })

        // For each Run do
        const promises = csvParseRuns.map(generateCsv)
        const results = await Promise.allSettled(promises)

        results.forEach((result, index) => {
            if (result.status === 'fulfilled') {
                console.log(`Run ${csvParseRuns[index].id} completed`)
            } else {
                console.error(`Run ${csvParseRuns[index].id} failed`)
            }
        })
    } catch (error) {
        console.error('Error generating csv', error)
    }
}

main()
