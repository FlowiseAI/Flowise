import React from 'react'
import {
    Box,
    Card,
    Typography,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    TablePagination,
    TableSortLabel,
    CircularProgress,
    Chip,
    Tooltip,
    IconButton,
    Skeleton
} from '@mui/material'
import InfoIcon from '@mui/icons-material/Info'
import { useUsageEvents } from './hooks/useUsageEvents'
import { format } from 'date-fns'
import { useUser } from '@auth0/nextjs-auth0/client'

// Skeleton row component for loading state
const SkeletonRow = ({ isAdmin = false }) => {
    const columns = isAdmin ? 5 : 4 // Adjust number of cells based on admin status

    return (
        <TableRow>
            {Array.from({ length: columns }).map((_, index) => (
                <TableCell key={index}>
                    <Skeleton variant='text' width={index === 0 ? 180 : 100} height={24} />
                </TableCell>
            ))}
        </TableRow>
    )
}

const UsageEventsTable: React.FC = () => {
    const { user } = useUser()
    const isAdmin = user?.['https://theanswer.ai/roles']?.includes('Admin')
    const { events, pagination, isLoading, isError, setPage, setLimit, setSorting, params } = useUsageEvents()

    const handleChangePage = (_: unknown, newPage: number) => {
        setPage(newPage + 1) // API is 1-indexed, MUI is 0-indexed
    }

    const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
        setLimit(parseInt(event.target.value, 10))
        setPage(1)
    }

    const handleSortRequest = (column: string) => {
        const isAsc = params.sortBy === column && params.sortOrder === 'asc'
        setSorting(column, isAsc ? 'desc' : 'asc')
    }

    if (isError) {
        return (
            <Box
                sx={{
                    p: 3,
                    mb: 3,
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: '12px',
                    bgcolor: 'rgba(0, 0, 0, 0.2)',
                    backdropFilter: 'blur(20px)'
                }}
            >
                <Box sx={{ p: 2, color: 'error.main' }}>
                    <Typography>Error loading usage events. Please try again later.</Typography>
                </Box>
            </Box>
        )
    }

    return (
        <Box
            sx={{
                p: 3,
                mb: 3,
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '12px',
                bgcolor: 'rgba(0, 0, 0, 0.2)',
                backdropFilter: 'blur(20px)'
            }}
        >
            <Box sx={{ p: 3, borderBottom: '1px solid rgba(255, 255, 255, 0.1)' }}>
                <Typography variant='h6' sx={{ color: '#fff', fontWeight: 600, mb: 1 }}>
                    Detailed Usage Events
                </Typography>
                <Typography variant='body2' sx={{ color: 'rgba(255, 255, 255, 0.5)' }}>
                    Individual events that consumed credits
                </Typography>
            </Box>
            <TableContainer>
                <Table>
                    <TableHead>
                        <TableRow>
                            <TableCell sortDirection={params.sortBy === 'timestamp' ? params.sortOrder : false}>
                                <TableSortLabel
                                    active={params.sortBy === 'timestamp'}
                                    direction={params.sortBy === 'timestamp' ? params.sortOrder : 'asc'}
                                    onClick={() => handleSortRequest('timestamp')}
                                    sx={{
                                        color: 'rgba(255, 255, 255, 0.7)',
                                        '&.MuiTableSortLabel-active': {
                                            color: 'rgba(255, 255, 255, 0.9)'
                                        },
                                        '& .MuiTableSortLabel-icon': {
                                            color: 'rgba(255, 255, 255, 0.5) !important'
                                        }
                                    }}
                                >
                                    Timestamp
                                </TableSortLabel>
                            </TableCell>
                            {isAdmin && <TableCell sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>User</TableCell>}
                            <TableCell sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>Chatflow</TableCell>
                            {/* <TableCell sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>Total Credits</TableCell> */}
                            <TableCell sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>Usage</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {isLoading ? (
                            // Skeleton rows during loading
                            Array.from({ length: pagination?.limit || 10 }).map((_, index) => <SkeletonRow key={index} isAdmin={isAdmin} />)
                        ) : events.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={isAdmin ? 5 : 4} align='center' sx={{ color: 'rgba(255, 255, 255, 0.5)' }}>
                                    No usage events found.
                                </TableCell>
                            </TableRow>
                        ) : (
                            events.map((event) => (
                                <TableRow key={event.id} hover sx={{ '&:hover': { bgcolor: 'rgba(255, 255, 255, 0.03)' } }}>
                                    <TableCell sx={{ color: 'rgba(255, 255, 255, 0.9)' }}>
                                        {format(new Date(event.timestamp), 'MMM d, yyyy HH:mm:ss')}
                                    </TableCell>
                                    {isAdmin && <TableCell sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>{event.userId}</TableCell>}
                                    <TableCell sx={{ color: 'rgba(255, 255, 255, 0.9)' }}>{event.chatflowName || 'Unknown'}</TableCell>
                                    {/* <TableCell sx={{ color: 'rgba(255, 255, 255, 0.9)' }}>{event.totalCredits.toFixed(2)}</TableCell> */}
                                    <TableCell>
                                        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                                            {event.breakdown.ai_tokens > 0 && (
                                                <Chip
                                                    size='small'
                                                    label={`AI: ${event.breakdown.ai_tokens.toFixed(2)}`}
                                                    sx={{ bgcolor: 'rgba(66, 133, 244, 0.1)', color: '#4285F4' }}
                                                />
                                            )}
                                            {event.breakdown.compute > 0 && (
                                                <Chip
                                                    size='small'
                                                    label={`Compute: ${event.breakdown.compute.toFixed(2)}`}
                                                    sx={{ bgcolor: 'rgba(52, 168, 83, 0.1)', color: '#34A853' }}
                                                />
                                            )}
                                            {event.breakdown.storage > 0 && (
                                                <Chip
                                                    size='small'
                                                    label={`Storage: ${event.breakdown.storage.toFixed(2)}`}
                                                    sx={{ bgcolor: 'rgba(251, 188, 5, 0.1)', color: '#FBBC05' }}
                                                />
                                            )}
                                        </Box>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </TableContainer>
            <TablePagination
                component='div'
                count={pagination?.totalItems || 0}
                page={(pagination?.page || 1) - 1}
                rowsPerPage={pagination?.limit || 10}
                onPageChange={handleChangePage}
                onRowsPerPageChange={handleChangeRowsPerPage}
                rowsPerPageOptions={[5, 10, 25, 50]}
                sx={{
                    borderTop: '1px solid rgba(255, 255, 255, 0.1)',
                    color: 'rgba(255, 255, 255, 0.9)',
                    '.MuiTablePagination-selectIcon': { color: 'rgba(255, 255, 255, 0.7)' },
                    '.MuiTablePagination-select': { color: 'rgba(255, 255, 255, 0.9)' },
                    '.MuiTablePagination-selectLabel': { color: 'rgba(255, 255, 255, 0.7)' },
                    '.MuiTablePagination-displayedRows': { color: 'rgba(255, 255, 255, 0.7)' },
                    '.MuiTablePagination-actions': {
                        '& .MuiIconButton-root': {
                            color: 'rgba(255, 255, 255, 0.7)',
                            '&.Mui-disabled': { color: 'rgba(255, 255, 255, 0.3)' },
                            '&:hover': { color: 'rgba(255, 255, 255, 0.9)' }
                        }
                    }
                }}
            />
        </Box>
    )
}

export default UsageEventsTable
