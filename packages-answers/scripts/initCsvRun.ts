import { S3, GetObjectCommand } from '@aws-sdk/client-s3'
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

const initCsvRun = async (csvParseRun: AppCsvParseRuns) => {
    try {
        // download csv from s3
        const originalCsv = await s3.send(
            new GetObjectCommand({
                Bucket: process.env.S3_STORAGE_BUCKET_NAME ?? '',
                Key: csvParseRun.originalCsvUrl.replace(`s3://${process.env.S3_STORAGE_BUCKET_NAME ?? ''}/`, '')
            })
        )
        // Get the CSV content as string
        const originalCsvText = (await originalCsv.Body?.transformToString()) ?? ''

        // parse csv
        const records = parse(originalCsvText, {
            columns: true,
            skip_empty_lines: true
        })

        // create csv parse rows
        const csvParseRows = records.map((row: any, index: number) => {
            return {
                csvParseRunId: csvParseRun.id,
                rowNumber: index,
                rowData: row
            }
        })

        // save csv parse rows
        await prisma.appCsvParseRows.createMany({
            data: csvParseRows
        })

        // update csv parse run status to inProgress
        await prisma.appCsvParseRuns.update({
            where: { id: csvParseRun.id },
            data: { status: 'inProgress' }
        })
        console.log(`Csv run ${csvParseRun.id} initialized`)
    } catch (error) {
        console.error(error)
    }
}

const main = async () => {
    try {
        console.log('start processing csv rows')

        // Get list of inProgress Runs
        const csvParseRuns = await prisma.appCsvParseRuns.findMany({
            where: {
                status: {
                    in: ['pending']
                }
            },
            orderBy: {
                startedAt: 'asc'
            },
            take: 1
        })

        // For each Run do
        const promises = csvParseRuns.map(initCsvRun)
        const results = await Promise.allSettled(promises)

        results.forEach((result, index) => {
            if (result.status === 'fulfilled') {
                console.log(`Run ${csvParseRuns[index].id} completed`)
            } else {
                console.error(`Run ${csvParseRuns[index].id} failed`)
            }
        })
    } catch (error) {
        console.error(error)
    }
}

main()
