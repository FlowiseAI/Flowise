'use client'

import { useEffect, useState } from 'react'
import { User } from 'types'
// material-ui
import { Stack, Button, Typography, Chip, Card } from '@mui/material'

import { fetchCsvParseRuns, downloadProcessedCsv, rerunCsvParseRun } from './actions'

const ProcessingHistory = ({ user }: { user: User }) => {
    const [csvParseRuns, setCsvParseRuns] = useState<any[]>([])

    const getData = async () => {
        const csvParseRuns = await fetchCsvParseRuns({
            userId: user.id,
            orgId: user.org_id
        })
        setCsvParseRuns(csvParseRuns)
    }

    useEffect(() => {
        getData()
    }, [user])

    const handleDownloadProcessedCsv = async (csvParseRunId: string) => {
        const csv = await downloadProcessedCsv({ csvParseRunId })
        if (!csv) return
        const url = window.URL.createObjectURL(new Blob([csv]))
        window.open(url, '_blank')
    }

    const handleRerunCsvParseRun = async (csvParseRunId: string) => {
        await rerunCsvParseRun({ csvParseRunId })
        getData()
    }

    return (
        <Stack flexDirection='column' sx={{ gap: 4 }}>
            {csvParseRuns?.map((run) => (
                <Card key={run.id} variant='outlined' sx={{ p: 2 }}>
                    <Stack flexDirection='column' sx={{ gap: 4 }}>
                        <Stack flexDirection='row' alignItems='center' justifyContent='space-between' sx={{ gap: 2 }}>
                            <Typography variant='h3'>{run.name}</Typography>
                            <Chip
                                label={run.status}
                                variant='outlined'
                                color={run.status === 'ready' ? 'success' : run.status === 'completeWithErrors' ? 'error' : 'warning'}
                            />
                        </Stack>
                        <Stack flexDirection='column' sx={{ gap: 2 }}>
                            <Typography variant='subtitle1'>{run.status !== 'ready' ? 'Processing...' : 'CSV processed'}</Typography>
                            <Typography variant='subtitle1'>Started At: {run.startedAt?.toLocaleString()}</Typography>
                            <Typography variant='subtitle1'>Completed At: {run.completedAt?.toLocaleString()}</Typography>
                            <Typography variant='subtitle1'>Rows Processed: {run.rowsProcessed}</Typography>
                            <Typography variant='subtitle1'>
                                Processing Time:{' '}
                                {run.completedAt
                                    ? `${new Date(run.completedAt).getTime() - new Date(run.startedAt).getTime()} seconds`
                                    : 'In Progress'}
                            </Typography>
                        </Stack>
                        <Stack flexDirection='row' sx={{ gap: 2 }}>
                            <Button
                                variant='contained'
                                color='primary'
                                disabled={run.status !== 'ready'}
                                onClick={() => handleDownloadProcessedCsv(run.id)}
                            >
                                Download Processed CSV
                            </Button>
                            <Button
                                variant='outlined'
                                color='secondary'
                                disabled={run.status !== 'ready'}
                                onClick={() => handleRerunCsvParseRun(run.id)}
                            >
                                Re-run
                            </Button>
                        </Stack>
                    </Stack>
                </Card>
            ))}
        </Stack>
    )
}

export default ProcessingHistory
