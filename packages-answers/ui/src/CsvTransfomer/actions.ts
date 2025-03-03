'use server'

// @ts-ignore
import { prisma } from '@db/client'
import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3'
// @ts-ignore
import { getUniqueDocumentPath } from '@utils/getUniqueDocumentPath'

export async function createCsvParseRun({
    userId,
    orgId,
    name,
    configuration,
    chatflowChatId,
    rowsRequested,
    file,
    includeOriginalColumns
}: {
    userId: string
    orgId: string
    name: string
    configuration: any
    chatflowChatId: string
    rowsRequested: number
    file: string | null
    includeOriginalColumns: boolean
}) {
    if (!file) return
    const uniqueDocumentPath = getUniqueDocumentPath({ organizationId: orgId, title: name })
    const key = `csv-parse-runs/${uniqueDocumentPath}.csv`
    // Convert data URL to Buffer
    const base64Data = file.replace(/^data:text\/csv;base64,/, '')
    const fileBuffer = Buffer.from(base64Data, 'base64')

    // Upload file to S3
    const s3 = new S3Client({
        region: process.env.S3_STORAGE_REGION ?? '',
        credentials: {
            accessKeyId: process.env.S3_STORAGE_ACCESS_KEY_ID ?? '',
            secretAccessKey: process.env.S3_STORAGE_SECRET_ACCESS_KEY ?? ''
        }
    })
    await s3.send(
        new PutObjectCommand({
            Bucket: process.env.S3_STORAGE_BUCKET_NAME ?? '',
            Key: key,
            Body: fileBuffer,
            ContentType: 'text/csv'
        })
    )

    const csvParseRun = await prisma.appCsvParseRuns.create({
        data: {
            userId,
            orgId,
            name,
            configuration,
            originalCsvUrl: `s3://${process.env.S3_STORAGE_BUCKET_NAME}/${key}`,
            chatflowChatId,
            rowsRequested,
            includeOriginalColumns
        }
    })
    return csvParseRun
}

export async function createCsvParseRows({
    csvParseRunId,
    rowNumber,
    rowData
}: {
    csvParseRunId: string
    rowNumber: number
    rowData: any
}) {
    const csvParseRows = await prisma.appCsvParseRows.create({
        data: {
            csvParseRunId,
            rowNumber,
            rowData
        }
    })
    return csvParseRows
}

export async function fetchCsvParseRuns({ userId, orgId }: { userId: string; orgId: string }) {
    const csvParseRuns = await prisma.appCsvParseRuns.findMany({
        where: {
            userId,
            orgId
        },
        orderBy: {
            startedAt: 'desc'
        }
    })
    return csvParseRuns
}

export async function fetchCsvParseRows({ csvParseRunId }: { csvParseRunId: string }) {
    const csvParseRows = await prisma.appCsvParseRows.findMany({
        where: {
            csvParseRunId
        }
    })
    return csvParseRows
}

export async function downloadProcessedCsv({ csvParseRunId }: { csvParseRunId: string }) {
    const csvParseRun = await prisma.appCsvParseRuns.findUnique({
        where: { id: csvParseRunId }
    })
    if (!csvParseRun) return
    const s3 = new S3Client({
        region: process.env.S3_STORAGE_REGION ?? '',
        credentials: {
            accessKeyId: process.env.S3_STORAGE_ACCESS_KEY_ID ?? '',
            secretAccessKey: process.env.S3_STORAGE_SECRET_ACCESS_KEY ?? ''
        }
    })
    console.log(csvParseRun.processedCsvUrl)
    const command = new GetObjectCommand({
        Bucket: process.env.S3_STORAGE_BUCKET_NAME ?? '',
        Key: csvParseRun.processedCsvUrl
    })
    const response = await s3.send(command)
    const csv = await response.Body?.transformToString()
    return csv
}

export async function fetchCsvParseRun({ csvParseRunId }: { csvParseRunId: string }) {
    const csvParseRun = await prisma.appCsvParseRuns.findUnique({
        where: { id: csvParseRunId }
    })
    if (!csvParseRun) return
    return csvParseRun
}

export async function cloneCsvParseRun({
    csvParseRunId,
    userId,
    orgId,
    name,
    configuration,
    chatflowChatId,
    rowsRequested,
    includeOriginalColumns
}: {
    csvParseRunId: string
    userId: string
    orgId: string
    name: string
    configuration: any
    chatflowChatId: string
    rowsRequested: number
    includeOriginalColumns: boolean
}) {
    const csvParseRun = await prisma.appCsvParseRuns.findUnique({
        where: { id: csvParseRunId }
    })
    if (!csvParseRun) return
    await prisma.appCsvParseRuns.create({
        data: {
            userId,
            orgId,
            name,
            configuration,
            originalCsvUrl: csvParseRun.originalCsvUrl,
            chatflowChatId,
            rowsRequested,
            includeOriginalColumns
        }
    })
}
