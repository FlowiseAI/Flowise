'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { User } from 'types'
import { Stack, Button, Chip, CircularProgress } from '@mui/material'
import { DataGrid } from '@mui/x-data-grid'

import { fetchCsvParseRuns, downloadProcessedCsv } from './actions'

const ProcessingHistory = ({ user }: { user: User }) => {
    const [csvParseRuns, setCsvParseRuns] = useState<any[]>([])
    const [loading, setLoading] = useState<boolean>(true)

    const getData = useCallback(async () => {
        setLoading(true)
        try {
            const csvParseRuns = await fetchCsvParseRuns({
                userId: user.id,
                orgId: user.org_id
            })
            setCsvParseRuns(csvParseRuns)
        } catch (error) {
            console.error('Error fetching CSV parse runs:', error)
        } finally {
            setLoading(false)
        }
    }, [user])

    useEffect(() => {
        getData()
    }, [getData])

    const handleDownloadProcessedCsv = async (csvParseRunId: string) => {
        const csv = await downloadProcessedCsv({ csvParseRunId })
        if (!csv) return
        const url = window.URL.createObjectURL(new Blob([csv]))
        const link = document.createElement('a')
        link.href = url
        link.setAttribute('download', `processed-csv-${csvParseRunId}.csv`)
        document.body.appendChild(link)
        link.click()
        link.remove()
        window.URL.revokeObjectURL(url)
    }

    const columns = [
        {
            field: 'name',
            headerName: 'Name',
            flex: 4,
            minWidth: 200,
            headerAlign: 'center' as const,
            align: 'center' as const,
            headerClassName: 'super-app-theme--header'
        },
        {
            field: 'status',
            headerName: 'Status',
            width: 150,
            headerAlign: 'center' as const,
            align: 'center' as const,
            headerClassName: 'super-app-theme--header',
            renderCell: (params: any) => (
                <Chip
                    label={params.value === 'ready' ? 'CSV Processed' : 'Processing...'}
                    variant='outlined'
                    color={params.value === 'ready' ? 'success' : params.value === 'completeWithErrors' ? 'error' : 'warning'}
                    size='small'
                    sx={{ fontSize: '0.825rem' }}
                />
            )
        },
        {
            field: 'startedAt',
            headerName: 'Started',
            width: 150,
            headerAlign: 'center' as const,
            align: 'center' as const,
            headerClassName: 'super-app-theme--header',
            valueFormatter: (params: any) =>
                params.value
                    ? new Date(params.value).toLocaleString(undefined, {
                          year: '2-digit',
                          month: 'numeric',
                          day: 'numeric',
                          hour: 'numeric',
                          minute: '2-digit'
                      })
                    : ''
        },
        {
            field: 'completedAt',
            headerName: 'Completed',
            width: 170,
            headerAlign: 'center' as const,
            align: 'center' as const,
            headerClassName: 'super-app-theme--header',
            valueFormatter: (params: any) =>
                params.value
                    ? new Date(params.value).toLocaleString(undefined, {
                          year: '2-digit',
                          month: 'numeric',
                          day: 'numeric',
                          hour: 'numeric',
                          minute: '2-digit'
                      })
                    : ''
        },
        {
            field: 'processingTime',
            headerName: 'Duration',
            width: 100,
            headerAlign: 'center' as const,
            align: 'center' as const,
            headerClassName: 'super-app-theme--header',
            valueGetter: (params: any) => {
                if (!params.row.completedAt) return ''
                const diffMs = new Date(params.row.completedAt).getTime() - new Date(params.row.startedAt).getTime()
                const days = Math.floor(diffMs / (24 * 60 * 60 * 1000))
                const hours = Math.floor((diffMs % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000))
                const minutes = Math.floor((diffMs % (60 * 60 * 1000)) / 60000)
                const seconds = Math.floor((diffMs % 60000) / 1000)

                const parts = []
                if (days > 0) parts.push(`${days}d`)
                if (hours > 0) parts.push(`${hours}h`)
                if (minutes > 0) parts.push(`${minutes}m`)
                if (seconds > 0 || parts.length === 0) parts.push(`${seconds}s`)

                return parts.join(' ')
            }
        },
        {
            field: 'rowsProcessed',
            headerName: 'Rows',
            width: 75,
            type: 'number',
            headerAlign: 'center' as const,
            align: 'center' as const,
            headerClassName: 'super-app-theme--header'
        },
        {
            field: 'actions',
            headerName: 'Actions',
            width: 200,
            headerAlign: 'center' as const,
            align: 'center' as const,
            headerClassName: 'super-app-theme--header',
            renderCell: (params: any) => (
                <Stack direction='row' spacing={1}>
                    <Button
                        size='small'
                        variant='contained'
                        color='primary'
                        disabled={params.row.status !== 'ready'}
                        onClick={() => handleDownloadProcessedCsv(params.row.id)}
                        sx={{ fontSize: '0.825rem', py: 0.5, px: 1 }}
                    >
                        Download
                    </Button>
                    <Button
                        size='small'
                        variant='outlined'
                        color='secondary'
                        disabled={params.row.status !== 'ready'}
                        sx={{ fontSize: '0.825rem', py: 0.5, px: 1 }}
                        component={Link}
                        href={`/sidekick-studio/csv-transformer?tab=process&cloneFrom=${params.row.id}`}
                    >
                        Clone
                    </Button>
                </Stack>
            )
        }
    ]

    return (
        <div style={{ height: 400, width: '100%' }}>
            <DataGrid
                rows={csvParseRuns}
                columns={columns}
                initialState={{
                    pagination: {
                        paginationModel: {
                            pageSize: 10
                        }
                    }
                }}
                pageSizeOptions={[10]}
                disableRowSelectionOnClick
                autoHeight
                loading={loading}
                components={{
                    LoadingOverlay: () => (
                        <Stack height='100%' alignItems='center' justifyContent='center'>
                            <CircularProgress />
                        </Stack>
                    )
                }}
                sx={{
                    '& .super-app-theme--header': {
                        fontWeight: 'bold',
                        fontSize: '0.875rem'
                    },
                    '& .MuiDataGrid-cell': {
                        fontSize: '0.825rem'
                    },
                    '& .MuiDataGrid-columnHeaders': {
                        fontWeight: 'bold'
                    }
                }}
            />
        </div>
    )
}

export default ProcessingHistory
