import fetch from 'node-fetch'
import { AppCsvParseRuns, AppCsvParseRows } from '../db/generated/prisma-client'
import { prisma } from '../db/src/client'

const BATCH_SIZE = 10

const runChatFlow = async (row: AppCsvParseRows, chatflowChatId: string) => {
    // TODO: use chatflowChatId instead of hardcoded id
    const response = await fetch('https://ias-prod.flowise.theanswer.ai/api/v1/prediction/47bb4c0a-dad8-409a-800a-772d54f5549c', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            question: row.rowData
        })
    })

    if (response.ok) {
        const data = await response.json()
        return data.json ?? {}
    } else {
        console.error(`Error processing row ${row.id}`, response)
        throw new Error(`Error processing row ${row.id}`)
    }
}

const processRow = async (row: AppCsvParseRows, chatflowChatId: string): Promise<any> => {
    try {
        console.log(`Processing row ${row.id}`)
        await prisma.appCsvParseRows.update({
            where: { id: row.id },
            data: { status: 'inProgress' }
        })
        // Call sidekick
        try {
            const result = await runChatFlow(row, chatflowChatId)
            // Store result on row, upsert rowData
            await prisma.appCsvParseRows.update({
                where: { id: row.id },
                data: { generatedData: result }
            })
            // Mark row as complete
            await prisma.appCsvParseRows.update({
                where: { id: row.id },
                data: { status: 'complete' }
            })
        } catch (err) {
            console.error(`Error processing row ${row.id}`, err)
            await prisma.appCsvParseRows.update({
                where: { id: row.id },
                data: { status: 'completeWithError' }
            })
        }
        return
    } catch (err) {
        console.error(`Error processing row ${row.id}`, err)
        // TODO: add error message to row
        let errorMessage: string = ''
        if (err instanceof Error) {
            errorMessage = err.message
        }
        await prisma.appCsvParseRows.update({
            where: { id: row.id },
            data: {
                status: 'completeWithError',
                errorMessage
            }
        })
        throw err
    }
}

const parseCsvRun = async (csvParseRun: AppCsvParseRuns): Promise<any> => {
    try {
        console.log(`Processing csv parse run ${csvParseRun.id}`)
        // mark run as inProgress
        if (csvParseRun.status === 'pending') {
            console.log(`Updating run ${csvParseRun.id} to inProgress`)
            await prisma.appCsvParseRuns.update({
                where: { id: csvParseRun.id },
                data: { status: 'inProgress' }
            })
        }

        const rowsRequested = csvParseRun.rowsRequested ?? 0
        let rowsProcessed = csvParseRun.rowsProcessed ?? 0

        const count = await prisma.appCsvParseRows.count({
            where: {
                csvParseRunId: csvParseRun.id
            }
        })

        const inProgressRows = await prisma.appCsvParseRows.count({
            where: {
                csvParseRunId: csvParseRun.id,
                status: 'inProgress'
            }
        })

        rowsProcessed += inProgressRows

        let rowsRemaining = count - (rowsProcessed ?? 0)

        let limit = BATCH_SIZE
        if (rowsRequested > 0) {
            limit = Math.min(rowsRequested, limit, rowsRemaining)
        }

        if (limit <= 0) {
            console.log(`No rows to process for run ${csvParseRun.id}, marking as complete`)
            await prisma.appCsvParseRuns.update({
                where: { id: csvParseRun.id },
                data: { status: 'complete' }
            })
            return
        }

        // TODO: Add inProgress rows so we can account for them in the limit of rows to process
        const rows = await prisma.appCsvParseRows.findMany({
            where: {
                csvParseRunId: csvParseRun.id,
                status: 'pending'
            },
            take: limit,
            orderBy: {
                rowNumber: 'asc'
            }
        })

        // If no rows, mark run as complete
        if (count === 0) {
            console.log(`No pending rows for run ${csvParseRun.id}, marking as complete`)
            await prisma.appCsvParseRuns.update({
                where: { id: csvParseRun.id },
                data: { status: 'complete' }
            })
            return
        }

        console.log(`Found ${rowsRemaining} pending rows for run ${csvParseRun.id}`)

        // Process rows
        const promises = rows.map((row) => processRow(row, csvParseRun.chatflowChatId))
        const results = await Promise.allSettled(promises)

        results.forEach((result, index) => {
            if (result.status === 'fulfilled') {
                console.log(`Row ${rows[index].id} completed`)
            } else {
                console.error(`Row ${rows[index].id} failed`)
            }
        })

        if (count === rows.length || (csvParseRun.rowsProcessed ?? 0) + rows.length >= rowsRequested) {
            // if no more rows, mark run as complete
            await prisma.appCsvParseRuns.update({
                where: { id: csvParseRun.id },
                data: { status: 'complete', rowsProcessed: (csvParseRun.rowsProcessed ?? 0) + rows.length }
            })
        } else {
            // Update run with number of rows processed
            await prisma.appCsvParseRuns.update({
                where: { id: csvParseRun.id },
                data: { rowsProcessed: (csvParseRun.rowsProcessed ?? 0) + rows.length }
            })
        }
        return
    } catch (err) {
        console.error(`Error processing run ${csvParseRun.id}`, err)
        let errorMessages: string[] = []
        if (err instanceof Error) {
            errorMessages.push(err.message)
        }
        await prisma.appCsvParseRuns.update({
            where: { id: csvParseRun.id },
            data: {
                status: 'completeWithErrors',
                errorMessages
            }
        })
        throw err
    }
}

const main = async () => {
    try {
        console.log('start processing csv rows')

        // Get list of inProgress Runs
        const csvParseRuns = await prisma.appCsvParseRuns.findMany({
            where: {
                status: {
                    in: ['inProgress']
                }
            },
            orderBy: {
                startedAt: 'asc'
            },
            take: 1
        })

        // For each Run do
        const promises = csvParseRuns.map(parseCsvRun)
        const results = await Promise.allSettled(promises)

        results.forEach((result, index) => {
            if (result.status === 'fulfilled') {
                console.log(`Run ${csvParseRuns[index].id} completed`)
            } else {
                console.error(`Run ${csvParseRuns[index].id} failed`)
            }
        })
    } catch (err) {
        console.error('Error processing csv runs', err)
    }
}

main()
