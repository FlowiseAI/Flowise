'use server'

import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3'
// @ts-ignore
import { getUniqueDocumentPath } from '@utils/getUniqueDocumentPath'
import getCachedSession from '../getCachedSession'

const API_BASE_URL = process.env.API_BASE_URL || `http://localhost:4000`

export async function createCsvParseRun({
    orgId,
    name,
    configuration,
    chatflowChatId,
    rowsRequested,
    file,
    includeOriginalColumns
}: {
    orgId: string
    name: string
    configuration: any
    chatflowChatId: string
    rowsRequested: number
    file: string | null
    includeOriginalColumns: boolean
}) {
    const session = await getCachedSession()
    if (!file || !session) return
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

    const response = await fetch(`${API_BASE_URL}/api/v1/csv-parser`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.accessToken}`
        },
        body: JSON.stringify({
            name,
            configuration,
            originalCsvUrl: `s3://${process.env.S3_STORAGE_BUCKET_NAME}/${key}`,
            chatflowChatId,
            rowsRequested,
            includeOriginalColumns
        })
    })

    const csvParseRun = await response.json()

    if (!response.ok) {
        throw new Error('Failed to create csv parse run')
    }
    return csvParseRun?.raw
}

export async function fetchCsvParseRuns() {
    const session = await getCachedSession()
    if (!session) return []
    const response = await fetch(`${API_BASE_URL}/api/v1/csv-parser`, {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.accessToken}`
        }
    })

    if (!response.ok) {
        throw new Error('Failed to fetch csv parse runs')
    }
    const csvParseRuns = await response.json()

    return csvParseRuns
}

export async function downloadProcessedCsv({ csvParseRunId }: { csvParseRunId: string }) {
    const csvParseRun = await fetchCsvParseRun({ csvParseRunId })
    if (!csvParseRun) return
    const s3 = new S3Client({
        region: process.env.S3_STORAGE_REGION ?? '',
        credentials: {
            accessKeyId: process.env.S3_STORAGE_ACCESS_KEY_ID ?? '',
            secretAccessKey: process.env.S3_STORAGE_SECRET_ACCESS_KEY ?? ''
        }
    })

    const command = new GetObjectCommand({
        Bucket: process.env.S3_STORAGE_BUCKET_NAME ?? '',
        Key: csvParseRun.processedCsvUrl ?? ''
    })
    const response = await s3.send(command)
    const csv = await response.Body?.transformToString()
    return csv
}

export async function fetchCsvParseRun({ csvParseRunId }: { csvParseRunId: string }) {
    const session = await getCachedSession()
    if (!session) return
    const response = await fetch(`${API_BASE_URL}/api/v1/csv-parser/${csvParseRunId}`, {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.accessToken}`
        }
    })

    if (!response.ok) {
        throw new Error('Failed to get csv parse run')
    }
    const csvParseRun = await response.json()
    return csvParseRun
}

export async function cloneCsvParseRun({
    csvParseRunId,
    orgId,
    name,
    configuration,
    chatflowChatId,
    rowsRequested,
    includeOriginalColumns,
    file
}: {
    csvParseRunId: string
    orgId: string
    name: string
    configuration: any
    chatflowChatId: string
    rowsRequested: number
    includeOriginalColumns: boolean
    file: string | null
}) {
    const session = await getCachedSession()
    if (!session) return
    let originalCsvUrl

    if (file) {
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
        originalCsvUrl = `s3://${process.env.S3_STORAGE_BUCKET_NAME}/${key}`
    } else {
        const csvParseRun = await fetchCsvParseRun({ csvParseRunId })
        originalCsvUrl = csvParseRun?.originalCsvUrl
    }

    if (!originalCsvUrl) return

    const response = await fetch(`${API_BASE_URL}/api/v1/csv-parser`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.accessToken}`
        },
        body: JSON.stringify({
            name,
            configuration,
            originalCsvUrl,
            chatflowChatId,
            rowsRequested,
            includeOriginalColumns
        })
    })

    if (!response.ok) {
        throw new Error('Failed to create csv parse run')
    }
    const csvParseRun = await response.json()

    return csvParseRun?.raw
}
