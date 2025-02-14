'use server'

// @ts-ignore
import { prisma } from '@db/client'

export async function createCsvParseRun({
    userId,
    orgId,
    name,
    configuration,
    originalCsvUrl,
    chatflowChatId,
    rowsRequested
}: {
    userId: string
    orgId: string
    name: string
    configuration: any
    originalCsvUrl: string
    chatflowChatId: string
    rowsRequested: number
}) {
    const csvParseRun = await prisma.appCsvParseRuns.create({
        data: {
            userId,
            orgId,
            name,
            configuration,
            originalCsvUrl,
            chatflowChatId,
            rowsRequested
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
