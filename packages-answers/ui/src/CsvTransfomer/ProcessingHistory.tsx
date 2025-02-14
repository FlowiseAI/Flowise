'use client'

import { useEffect, useState } from 'react'
import { User } from 'types'
// material-ui
import { Stack, Button, Typography, Chip, Card } from '@mui/material'

import { fetchCsvParseRuns } from './actions'

const ProcessingHistory = ({ user }: { user: User }) => {
    const [csvParseRuns, setCsvParseRuns] = useState<any[]>([])
    useEffect(() => {
        const getData = async () => {
            const csvParseRuns = await fetchCsvParseRuns({
                userId: user.id,
                orgId: user.org_id
            })
            setCsvParseRuns(csvParseRuns)
        }
        getData()
    }, [user])

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
                                color={run.status === 'success' ? 'success' : run.status === 'pending' ? 'warning' : 'error'}
                            />
                        </Stack>
                        <Stack flexDirection='column' sx={{ gap: 2 }}>
                            <Typography variant='subtitle1'>CSV processed successfully</Typography>
                            <Typography variant='subtitle1'>Timestamp: {run.startedAt?.toLocaleString()}</Typography>
                            <Typography variant='subtitle1'>Rows Processed: {run.rowsProcessed}</Typography>
                            <Typography variant='subtitle1'>Processing Time: 10 seconds</Typography>
                        </Stack>
                        <Stack flexDirection='row' sx={{ gap: 2 }}>
                            <Button variant='contained' color='primary'>
                                Download Processed CSV
                            </Button>
                            <Button variant='outlined' color='secondary'>
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
