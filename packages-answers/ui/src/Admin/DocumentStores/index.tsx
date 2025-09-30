'use client'
import { useMemo, useState, type ChangeEvent } from 'react'
import { Link } from 'react-router-dom'
import {
    Box,
    Button,
    Chip,
    IconButton,
    Paper,
    Skeleton,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TablePagination,
    TableRow,
    TableSortLabel,
    TextField,
    Tooltip,
    Typography
} from '@mui/material'
import RefreshIcon from '@mui/icons-material/Refresh'
import LaunchIcon from '@mui/icons-material/Launch'
import documentStoreApi from '@/api/documentstore'
import useApi from '@ui/hooks/useApi'
import { format } from 'date-fns'

export type AdminDocumentStore = {
    id: string
    name: string
    description?: string
    status: string
    createdDate: string
    updatedDate: string
    loaders?: Array<{ id: string }>
    totalChunks?: number
    totalChars?: number
    user?: {
        id?: string
        name?: string | null
        email?: string | null
    }
    organizationId?: string
    userId?: string
    isOwner?: boolean
}

const columns: Array<{ id: keyof AdminDocumentStore | 'owner' | 'loadersCount'; label: string }> = [
    { id: 'name', label: 'Name' },
    { id: 'status', label: 'Status' },
    { id: 'owner', label: 'Owner' },
    { id: 'loadersCount', label: 'Loaders' },
    { id: 'totalChunks', label: 'Chunks' },
    { id: 'updatedDate', label: 'Last Updated' }
]

type OrderableColumn = 'name' | 'updatedDate' | 'totalChunks' | 'loadersCount'

type Order = 'asc' | 'desc'

const AdminDocumentStores = () => {
    const {
        data: documentStoresData,
        isLoading,
        isError,
        refresh
    } = useApi<AdminDocumentStore[]>('/api/admin/document-stores', () => documentStoreApi.getAdminDocumentStores())

    const [orderBy, setOrderBy] = useState<OrderableColumn>('updatedDate')
    const [order, setOrder] = useState<Order>('desc')
    const [page, setPage] = useState(0)
    const [rowsPerPage, setRowsPerPage] = useState(25)
    const [search, setSearch] = useState('')

    const filteredAndSorted = useMemo(() => {
        if (!documentStoresData) return []

        const normalizedSearch = search.trim().toLowerCase()
        const filtered = documentStoresData.filter((store) => {
            if (!normalizedSearch) return true
            const ownerLabel = store.user?.name || store.user?.email || ''
            return (
                store.name.toLowerCase().includes(normalizedSearch) ||
                (store.description || '').toLowerCase().includes(normalizedSearch) ||
                ownerLabel.toLowerCase().includes(normalizedSearch)
            )
        })

        const sorted = [...filtered].sort((a, b) => {
            let aValue: string | number = ''
            let bValue: string | number = ''

            switch (orderBy) {
                case 'name':
                    aValue = a.name.toLowerCase()
                    bValue = b.name.toLowerCase()
                    break
                case 'totalChunks':
                    aValue = a.totalChunks ?? 0
                    bValue = b.totalChunks ?? 0
                    break
                case 'loadersCount':
                    aValue = a.loaders?.length ?? 0
                    bValue = b.loaders?.length ?? 0
                    break
                case 'updatedDate':
                default:
                    aValue = new Date(a.updatedDate).getTime()
                    bValue = new Date(b.updatedDate).getTime()
                    break
            }

            if (aValue < bValue) {
                return order === 'asc' ? -1 : 1
            }
            if (aValue > bValue) {
                return order === 'asc' ? 1 : -1
            }
            return 0
        })

        return sorted
    }, [documentStoresData, order, orderBy, search])

    const paginatedData = useMemo(() => {
        const start = page * rowsPerPage
        return filteredAndSorted.slice(start, start + rowsPerPage)
    }, [filteredAndSorted, page, rowsPerPage])

    const handleRequestSort = (property: OrderableColumn) => {
        const isAsc = orderBy === property && order === 'asc'
        setOrder(isAsc ? 'desc' : 'asc')
        setOrderBy(property)
    }

    const handleChangePage = (_: unknown, newPage: number) => {
        setPage(newPage)
    }

    const handleChangeRowsPerPage = (event: ChangeEvent<HTMLInputElement>) => {
        setRowsPerPage(parseInt(event.target.value, 10))
        setPage(0)
    }

    const renderSkeleton = () => {
        return Array.from({ length: 5 }).map((_, index) => (
            <TableRow key={`skeleton-${index}`}>
                {columns.map((column) => (
                    <TableCell key={`${column.id}-${index}`}>
                        <Skeleton variant='text' height={24} />
                    </TableCell>
                ))}
                <TableCell>
                    <Skeleton variant='circular' width={24} height={24} />
                </TableCell>
            </TableRow>
        ))
    }

    return (
        <Box sx={{ p: { xs: 1, md: 4 } }}>
            <Box sx={{ mb: 2 }}>
                <Button component={Link} to='/admin' size='small' variant='text'>
                    ← Back to admin
                </Button>
            </Box>

            <Box sx={{ pb: 4, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2 }}>
                <Box>
                    <Typography variant='h4' sx={{ fontWeight: 600, color: '#fff', mb: 1 }}>
                        Document Stores
                    </Typography>
                    <Typography sx={{ color: 'rgba(255, 255, 255, 0.5)', fontSize: '0.875rem' }}>
                        Review and manage every document store in your organization.
                    </Typography>
                </Box>
                <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                    <TextField
                        value={search}
                        onChange={(event) => {
                            setSearch(event.target.value)
                            setPage(0)
                        }}
                        size='small'
                        placeholder='Search by name, description, or owner'
                        sx={{ minWidth: 280 }}
                    />
                    <Tooltip title='Refresh list'>
                        <IconButton onClick={() => refresh()} color='primary'>
                            <RefreshIcon />
                        </IconButton>
                    </Tooltip>
                </Box>
            </Box>

            <TableContainer component={Paper} sx={{ backgroundColor: 'rgba(16, 24, 40, 0.6)' }}>
                <Table>
                    <TableHead>
                        <TableRow>
                            {columns.map((column) => {
                                const isSortable = ['name', 'updatedDate', 'totalChunks', 'loadersCount'].includes(column.id)
                                return (
                                    <TableCell key={column.id} sx={{ color: 'rgba(255, 255, 255, 0.7)', fontWeight: 600 }}>
                                        {isSortable ? (
                                            <TableSortLabel
                                                active={orderBy === column.id}
                                                direction={orderBy === column.id ? order : 'asc'}
                                                onClick={() => handleRequestSort(column.id as OrderableColumn)}
                                            >
                                                {column.label}
                                            </TableSortLabel>
                                        ) : (
                                            column.label
                                        )}
                                    </TableCell>
                                )
                            })}
                            <TableCell sx={{ color: 'rgba(255, 255, 255, 0.7)', fontWeight: 600 }}>Actions</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {isLoading && renderSkeleton()}
                        {!isLoading && paginatedData.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={columns.length + 1}>
                                    <Box sx={{ py: 4, textAlign: 'center', color: 'rgba(255, 255, 255, 0.6)' }}>
                                        {isError ? 'Failed to load document stores.' : 'No document stores found.'}
                                    </Box>
                                </TableCell>
                            </TableRow>
                        )}
                        {!isLoading &&
                            paginatedData.map((store) => {
                                const ownerLabel = store.user?.name || store.user?.email || 'Unknown owner'
                                const loadersCount = store.loaders?.length ?? 0
                                const updatedAt = format(new Date(store.updatedDate), 'MMM d, yyyy p')
                                const detailPath = `/sidekick-studio/document-stores/${store.id}`

                                return (
                                    <TableRow key={store.id} hover>
                                        <TableCell>
                                            <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                                                <Typography sx={{ fontWeight: 600, color: '#fff' }}>{store.name}</Typography>
                                                {store.description && (
                                                    <Typography sx={{ color: 'rgba(255, 255, 255, 0.6)', fontSize: '0.875rem' }}>
                                                        {store.description}
                                                    </Typography>
                                                )}
                                            </Box>
                                        </TableCell>
                                        <TableCell>
                                            <Chip label={store.status} size='small' color='primary' variant='outlined' />
                                        </TableCell>
                                        <TableCell>
                                            <Typography sx={{ color: 'rgba(255, 255, 255, 0.8)' }}>{ownerLabel}</Typography>
                                        </TableCell>
                                        <TableCell>
                                            <Typography sx={{ color: 'rgba(255, 255, 255, 0.8)' }}>{loadersCount}</Typography>
                                        </TableCell>
                                        <TableCell>
                                            <Typography sx={{ color: 'rgba(255, 255, 255, 0.8)' }}>{store.totalChunks ?? 0}</Typography>
                                        </TableCell>
                                        <TableCell>
                                            <Typography sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>{updatedAt}</Typography>
                                        </TableCell>
                                        <TableCell>
                                            <Tooltip title='Open document store'>
                                                <IconButton component={Link} to={detailPath} size='small' color='primary'>
                                                    <LaunchIcon fontSize='small' />
                                                </IconButton>
                                            </Tooltip>
                                        </TableCell>
                                    </TableRow>
                                )
                            })}
                    </TableBody>
                </Table>
            </TableContainer>
            <TablePagination
                component='div'
                rowsPerPageOptions={[10, 25, 50]}
                count={filteredAndSorted.length}
                rowsPerPage={rowsPerPage}
                page={page}
                onPageChange={handleChangePage}
                onRowsPerPageChange={handleChangeRowsPerPage}
            />
        </Box>
    )
}

export default AdminDocumentStores
