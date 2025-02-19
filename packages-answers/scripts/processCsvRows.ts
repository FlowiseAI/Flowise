import { AppCsvParseRuns, AppCsvParseRows } from '../db/generated/prisma-client'
import { prisma } from '../db/src/client'

const BATCH_SIZE = 10

const sidekick = async () => {
    // TODO: Replace with actual sidekick call
    await new Promise((resolve) => setTimeout(resolve, 500))
    return { colx: 'val1', coly: 'val2', colz: 'val3' }
}

const processRow = async (row: AppCsvParseRows): Promise<any> => {
    try {
        console.log(`Processing row ${row.id}`)
        await prisma.appCsvParseRows.update({
            where: { id: row.id },
            data: { status: 'inProgress' }
        })
        // Call sidekick
        try {
            const result = await sidekick()
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
        await prisma.appCsvParseRows.update({
            where: { id: row.id },
            data: { status: 'completeWithError' }
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
        const rowsProcessed = csvParseRun.rowsProcessed ?? 0

        const count = await prisma.appCsvParseRows.count({
            where: {
                csvParseRunId: csvParseRun.id,
                status: 'pending'
            }
        })

        let rowsRemaining = count - (rowsProcessed ?? 0)

        let limit = BATCH_SIZE
        if (rowsRequested > 0) {
            limit = Math.min(rowsRequested, limit, rowsRemaining)
        }

        const rows = await prisma.appCsvParseRows.findMany({
            where: {
                csvParseRunId: csvParseRun.id,
                status: 'pending'
            },
            take: limit
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

        console.log(`Found ${count} pending rows for run ${csvParseRun.id}`)

        // Process rows
        const promises = rows.map(processRow)
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
        await prisma.appCsvParseRuns.update({
            where: { id: csvParseRun.id },
            data: { status: 'completeWithErrors' }
        })
        throw err
    }
}

const main = async () => {
    try {
        console.log('start processing csv rows')

        // Get list of pending or inProgress Runs
        const csvParseRuns = await prisma.appCsvParseRuns.findMany({
            where: {
                status: {
                    in: ['pending', 'inProgress']
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
