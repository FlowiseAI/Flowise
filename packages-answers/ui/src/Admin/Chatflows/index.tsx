'use client'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
    Box,
    Skeleton,
    Typography,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    IconButton,
    Tooltip,
    Chip,
    TablePagination,
    TableSortLabel,
    Autocomplete,
    TextField,
    Button,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Switch,
    FormControlLabel,
    Checkbox,
    ToggleButtonGroup,
    ToggleButton
} from '@mui/material'
import FilterListIcon from '@mui/icons-material/FilterList'
import TemplateIcon from '@mui/icons-material/AccountTree'
import HistoryIcon from '@mui/icons-material/History'
import RestoreIcon from '@mui/icons-material/Restore'
import chatflowsApi from '@/api/chatflows'
import useApi from '@ui/hooks/useApi'
import { format } from 'date-fns'
import VisibilityIcon from '@mui/icons-material/Visibility'
import BarChartIcon from '@mui/icons-material/BarChart'
import Metrics from './metrics'

// Skeleton row component for loading state
const SkeletonRow = () => {
    return (
        <TableRow>
            <TableCell>
                <Skeleton variant='text' width={200} height={24} />
                <Skeleton variant='text' width={300} height={16} sx={{ mt: 0.5 }} />
            </TableCell>
            <TableCell>
                <Skeleton variant='text' width={100} height={24} />
            </TableCell>
            <TableCell>
                <Skeleton variant='text' width={80} height={24} />
            </TableCell>
            <TableCell>
                <Skeleton variant='text' width={120} height={24} />
            </TableCell>
            <TableCell>
                <Skeleton variant='text' width={120} height={24} />
            </TableCell>
            <TableCell>
                <Skeleton variant='text' width={80} height={24} />
            </TableCell>
            <TableCell>
                <Skeleton variant='text' width={60} height={24} />
            </TableCell>
        </TableRow>
    )
}

const AdminChatflows = () => {
    const [error, setError] = useState<null | string>(null)
    const [page, setPage] = useState(0)
    const [rowsPerPage, setRowsPerPage] = useState(25)
    const [orderBy, setOrderBy] = useState<string>('createdDate')
    const [order, setOrder] = useState<'asc' | 'desc'>('desc')
    const [isFilterExpanded, setIsFilterExpanded] = useState(false)
    const [selectedCategories, setSelectedCategories] = useState<string[]>([])
    const [selectedOwners, setSelectedOwners] = useState<string[]>([])
    const [keywordFilter, setKeywordFilter] = useState('')
    const [metricsModalOpen, setMetricsModalOpen] = useState(false)
    const [selectedChatflowId, setSelectedChatflowId] = useState<string>('')
    const [showTemplateOnly, setShowTemplateOnly] = useState(false)
    const [templateStatusFilter, setTemplateStatusFilter] = useState<string[]>([])
    const [selectedForUpdate, setSelectedForUpdate] = useState<string[]>([])

    // Versioning state
    const [versionModalOpen, setVersionModalOpen] = useState(false)
    const [selectedChatflowForVersions, setSelectedChatflowForVersions] = useState<string>('')
    const [rollbackConfirmOpen, setRollbackConfirmOpen] = useState(false)
    const [selectedVersionForRollback, setSelectedVersionForRollback] = useState<number | null>(null)
    const [chatflowVersions, setChatflowVersions] = useState<any[]>([])

    // Flow type and version state
    const [flowType, setFlowType] = useState<string>(localStorage.getItem('adminFlowType') || 'CHATFLOW')
    const [agentflowVersion, setAgentflowVersion] = useState<string>(localStorage.getItem('agentFlowVersion') || 'v2')

    const {
        data: chatflowsData,
        isLoading: getAllChatflowsApiLoading,
        isError: getAllChatflowsApiError,
        refresh: refreshChatflows
    } = useApi('/api/chatflows', () => {
        const type = flowType === 'AGENTFLOW' ? (agentflowVersion === 'v2' ? 'AGENTFLOW' : 'MULTIAGENT') : 'CHATFLOW'
        return chatflowsApi.getAdminChatflows(
            {
                select: [
                    'name',
                    'type',
                    'description',
                    'category',
                    'userId',
                    'createdDate',
                    'updatedDate',
                    'parentChatflowId',
                    'currentVersion'
                ]
            },
            type
        )
    })

    const {
        data: defaultTemplateData,
        isLoading: _defaultTemplateLoading,
        isError: _defaultTemplateError
    } = useApi('/api/admin/default-template', () => chatflowsApi.getDefaultChatflowTemplate())

    const handleChangePage = (event: unknown, newPage: number) => {
        setPage(newPage)
    }

    const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
        setRowsPerPage(parseInt(event.target.value, 10))
        setPage(0)
    }

    const handleRequestSort = (property: string) => {
        const isAsc = orderBy === property && order === 'asc'
        setOrder(isAsc ? 'desc' : 'asc')
        setOrderBy(property)
        setPage(0)
    }

    const handleFlowTypeChange = (event: any, nextValue: string) => {
        if (nextValue === null) return
        localStorage.setItem('adminFlowType', nextValue)
        setFlowType(nextValue)
        setPage(0)
        refreshChatflows()
    }

    const handleVersionChange = (event: any, nextValue: string) => {
        if (nextValue === null) return
        localStorage.setItem('agentFlowVersion', nextValue)
        setAgentflowVersion(nextValue)
        setPage(0)
        refreshChatflows()
    }

    const getCanvasRoute = (chatflow: any) => {
        // For react-router-dom Link component (relative paths)
        console.log('🤖id', chatflow.id)
        console.log('type', chatflow)
        if (chatflow.type === 'AGENTFLOW') {
            return `/v2/agentcanvas/${chatflow.id}`
        } else if (chatflow.type === 'MULTIAGENT') {
            return `/agentcanvas/${chatflow.id}`
        } else {
            // Default to regular chatflow canvas
            return `/canvas/${chatflow.id}`
        }
    }

    const getCanvasFullUrl = (chatflow: any) => {
        // For window.open() (full URLs with base path)
        if (chatflow.type === 'AGENTFLOW') {
            return `/sidekick-studio/v2/agentcanvas/${chatflow.id}`
        } else if (chatflow.type === 'MULTIAGENT') {
            return `/sidekick-studio/agentcanvas/${chatflow.id}`
        } else {
            // Default to regular chatflow canvas
            return `/sidekick-studio/canvas/${chatflow.id}`
        }
    }

    const sortData = (data: any[]) => {
        if (!data) return data

        return [...data].sort((a, b) => {
            let aValue = a[orderBy]
            let bValue = b[orderBy]

            // Convert dates to timestamps for comparison
            if (orderBy === 'createdDate' || orderBy === 'updatedDate') {
                aValue = new Date(aValue).getTime()
                bValue = new Date(bValue).getTime()
            }

            if (order === 'asc') {
                return aValue > bValue ? 1 : -1
            } else {
                return aValue < bValue ? 1 : -1
            }
        })
    }

    const filterData = (data: any[]) => {
        if (!data) return data

        return data.filter((chatflow) => {
            // Category filter
            if (selectedCategories.length > 0) {
                const categories = (chatflow.category || 'Uncategorized').split(';').map((cat: string) => cat.trim())
                const hasMatchingCategory = selectedCategories.some((selectedCat) =>
                    categories.some((cat) => cat.toLowerCase().includes(selectedCat.toLowerCase()))
                )
                if (!hasMatchingCategory) return false
            }

            // Owner filter
            if (selectedOwners.length > 0) {
                const ownerId = chatflow.isOwner ? 'me' : chatflow.userId
                if (!selectedOwners.includes(ownerId)) return false
            }

            // Keyword filter
            if (keywordFilter.trim()) {
                const searchText = keywordFilter.toLowerCase()
                const nameMatch = chatflow.name.toLowerCase().includes(searchText)
                const descriptionMatch = chatflow.description?.toLowerCase().includes(searchText) || false
                if (!nameMatch && !descriptionMatch) return false
            }

            // Template-only filter
            if (showTemplateOnly && !chatflow.isFromTemplate) {
                return false
            }

            // Template status filter
            if (templateStatusFilter.length > 0 && !templateStatusFilter.includes(chatflow.templateStatus)) {
                return false
            }

            return true
        })
    }

    const getAllCategories = () => {
        if (!chatflowsData) return []

        const categories = new Set<string>()
        chatflowsData.forEach((chatflow) => {
            const chatflowCategories = (chatflow.category || 'Uncategorized').split(';').map((cat: string) => cat.trim())
            chatflowCategories.forEach((cat) => categories.add(cat))
        })

        return Array.from(categories).sort((a, b) => a.localeCompare(b))
    }

    const getAllOwners = () => {
        if (!chatflowsData) return []

        const ownersMap = new Map<string, string>()
        chatflowsData.forEach((chatflow) => {
            if (chatflow.isOwner) {
                ownersMap.set('me', 'Me')
            } else if (chatflow.user?.name) {
                ownersMap.set(chatflow.userId, chatflow.user.name)
            } else if (chatflow.user?.email) {
                ownersMap.set(chatflow.userId, chatflow.user.email)
            } else {
                ownersMap.set(chatflow.userId, chatflow.userId)
            }
        })

        return Array.from(ownersMap.entries())
            .map(([id, name]) => ({
                label: name,
                value: id
            }))
            .sort((a, b) => a.label.localeCompare(b.label))
    }

    const handleOpenMetrics = (chatflowId: string) => {
        setSelectedChatflowId(chatflowId)
        setMetricsModalOpen(true)
    }

    const handleCloseMetrics = () => {
        setMetricsModalOpen(false)
        setSelectedChatflowId('')
    }

    // Versioning functions
    const handleOpenVersions = async (chatflowId: string) => {
        try {
            const response = await chatflowsApi.getChatflowVersions(chatflowId)
            const versionsData = response.data || {}

            // Sort versions in descending order (newest first) and add currentVersion info
            const sortedVersions = (versionsData.versions || []).sort((a: any, b: any) => b.version - a.version)

            // Add current version indicator to each version
            const versionsWithCurrentInfo = sortedVersions.map((version: any) => ({
                ...version,
                isCurrent: version.version === versionsData.currentVersion
            }))

            setChatflowVersions(versionsWithCurrentInfo)
            setSelectedChatflowForVersions(chatflowId)
            setVersionModalOpen(true)
        } catch (error) {
            console.error('Failed to load versions:', error)
        }
    }

    const handleCloseVersions = () => {
        setVersionModalOpen(false)
        setSelectedChatflowForVersions('')
        setChatflowVersions([])
    }

    const handleRollbackConfirm = async () => {
        if (selectedChatflowForVersions && selectedVersionForRollback !== null) {
            try {
                await chatflowsApi.rollbackChatflowToVersion(selectedChatflowForVersions, selectedVersionForRollback)
                setRollbackConfirmOpen(false)
                setSelectedVersionForRollback(null)
                handleCloseVersions()
                // Refresh data
                window.location.reload()
            } catch (error) {
                console.error('Failed to rollback chatflow:', error)
            }
        }
    }

    useEffect(() => {
        if (getAllChatflowsApiError) {
            setError('Failed to load chatflows.')
        }
    }, [getAllChatflowsApiError])

    useEffect(() => {
        refreshChatflows()
    }, [flowType, agentflowVersion])

    if (error) {
        return (
            <Box sx={{ p: { xs: 1, md: 4 } }}>
                <Box sx={{ p: 3, color: 'error.main' }}>
                    <Typography>{error}</Typography>
                </Box>
            </Box>
        )
    }

    return (
        <Box sx={{ p: { xs: 1, md: 4 } }}>
            <Box sx={{ mb: 2 }}>
                <Button component={Link} to='/admin' size='small' variant='text'>
                    ← Back to admin
                </Button>
            </Box>
            <Box sx={{ pb: 4 }} display='flex' alignItems='center' justifyContent='space-between'>
                <Box>
                    <Typography variant='h4' sx={{ fontWeight: 600, color: '#fff', mb: 1 }}>
                        All {flowType === 'CHATFLOW' ? 'Chatflows' : 'Agent Flows'}
                    </Typography>
                    <Typography sx={{ color: 'rgba(255, 255, 255, 0.5)', fontSize: '0.875rem' }}>
                        Manage {flowType === 'CHATFLOW' ? 'chatflow' : 'agent flow'} configurations
                    </Typography>
                </Box>
                <IconButton
                    onClick={() => setIsFilterExpanded(!isFilterExpanded)}
                    sx={{
                        color: 'rgba(255, 255, 255, 0.7)',
                        '&:hover': { color: 'rgba(255, 255, 255, 0.9)' },
                        transition: 'transform 0.2s ease-in-out',
                        transform: isFilterExpanded ? 'rotate(180deg)' : 'rotate(0deg)'
                    }}
                >
                    <FilterListIcon />
                </IconButton>
            </Box>

            {/* Flow Type and Version Filters */}
            <Box sx={{ mb: 3, display: 'flex', gap: 3, alignItems: 'center' }}>
                <Box>
                    <Typography variant='body2' sx={{ color: 'rgba(255, 255, 255, 0.7)', mb: 1, fontSize: '0.875rem' }}>
                        Flow Type
                    </Typography>
                    <ToggleButtonGroup
                        value={flowType}
                        exclusive
                        onChange={handleFlowTypeChange}
                        sx={{
                            borderRadius: 2,
                            '& .MuiToggleButton-root': {
                                color: 'rgba(255, 255, 255, 0.7)',
                                border: '1px solid rgba(255, 255, 255, 0.2)',
                                '&:hover': {
                                    bgcolor: 'rgba(255, 255, 255, 0.1)'
                                },
                                '&.Mui-selected': {
                                    bgcolor: 'rgba(33, 150, 243, 0.3)',
                                    color: 'rgba(33, 150, 243, 0.9)',
                                    '&:hover': {
                                        bgcolor: 'rgba(33, 150, 243, 0.4)'
                                    }
                                }
                            }
                        }}
                    >
                        <ToggleButton value='CHATFLOW' sx={{ px: 3, py: 1 }}>
                            Chatflows
                        </ToggleButton>
                        <ToggleButton value='AGENTFLOW' sx={{ px: 3, py: 1 }}>
                            Agent Flows
                        </ToggleButton>
                    </ToggleButtonGroup>
                </Box>

                {flowType === 'AGENTFLOW' && (
                    <Box>
                        <Typography variant='body2' sx={{ color: 'rgba(255, 255, 255, 0.7)', mb: 1, fontSize: '0.875rem' }}>
                            Agent Flow Version
                        </Typography>
                        <ToggleButtonGroup
                            value={agentflowVersion}
                            exclusive
                            onChange={handleVersionChange}
                            sx={{
                                borderRadius: 2,
                                '& .MuiToggleButton-root': {
                                    color: 'rgba(255, 255, 255, 0.7)',
                                    border: '1px solid rgba(255, 255, 255, 0.2)',
                                    '&:hover': {
                                        bgcolor: 'rgba(255, 255, 255, 0.1)'
                                    },
                                    '&.Mui-selected': {
                                        bgcolor: 'rgba(76, 175, 80, 0.3)',
                                        color: 'rgba(76, 175, 80, 0.9)',
                                        '&:hover': {
                                            bgcolor: 'rgba(76, 175, 80, 0.4)'
                                        }
                                    }
                                }
                            }}
                        >
                            <ToggleButton value='v2' sx={{ px: 3, py: 1 }}>
                                V2 (Current)
                            </ToggleButton>
                            <ToggleButton value='v1' sx={{ px: 3, py: 1 }}>
                                V1 (Legacy)
                            </ToggleButton>
                        </ToggleButtonGroup>
                    </Box>
                )}
            </Box>

            {/* Default Template Details */}
            {defaultTemplateData &&
                chatflowsData &&
                (() => {
                    // Find the full chatflow data for the default template
                    const fullDefaultTemplate = chatflowsData.find((chatflow: any) => chatflow.id === defaultTemplateData.id)
                    if (!fullDefaultTemplate) return false

                    return (
                        <Box sx={{ mb: 3 }}>
                            <Box
                                sx={{
                                    p: 3,
                                    border: '1px solid rgba(255, 193, 7, 0.3)',
                                    borderRadius: '12px',
                                    bgcolor: 'rgba(255, 193, 7, 0.1)',
                                    backdropFilter: 'blur(20px)'
                                }}
                            >
                                {/* Header Section */}
                                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                        <TemplateIcon sx={{ color: 'rgba(255, 193, 7, 0.9)', fontSize: '2rem' }} />
                                        <Box>
                                            <Typography variant='h6' sx={{ color: 'rgba(255, 193, 7, 0.9)', fontWeight: 600, mb: 0.5 }}>
                                                Organization Default Template
                                            </Typography>
                                            <Typography variant='body2' sx={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: '0.875rem' }}>
                                                This is the template used for all new user chatflows
                                            </Typography>
                                        </Box>
                                    </Box>
                                    <Chip
                                        label='DEFAULT TEMPLATE'
                                        sx={{
                                            bgcolor: 'rgba(255, 193, 7, 0.3)',
                                            color: 'rgba(255, 193, 7, 0.9)',
                                            border: '1px solid rgba(255, 193, 7, 0.5)',
                                            fontSize: '0.75rem',
                                            fontWeight: 600
                                        }}
                                    />
                                </Box>

                                {/* Template Details Grid */}
                                <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 3, mb: 3 }}>
                                    {/* Left Column */}
                                    <Box>
                                        {/* Name */}
                                        <Box sx={{ mb: 2 }}>
                                            <Typography
                                                variant='body2'
                                                sx={{ color: 'rgba(255, 193, 7, 0.7)', fontSize: '0.75rem', mb: 0.5 }}
                                            >
                                                NAME
                                            </Typography>
                                            <Typography variant='body1' sx={{ color: 'rgba(255, 255, 255, 0.9)', fontWeight: 500 }}>
                                                {fullDefaultTemplate.name}
                                            </Typography>
                                        </Box>

                                        {/* Description */}
                                        {fullDefaultTemplate.description && (
                                            <Box sx={{ mb: 2 }}>
                                                <Typography
                                                    variant='body2'
                                                    sx={{ color: 'rgba(255, 193, 7, 0.7)', fontSize: '0.75rem', mb: 0.5 }}
                                                >
                                                    DESCRIPTION
                                                </Typography>
                                                <Typography variant='body2' sx={{ color: 'rgba(255, 255, 255, 0.8)' }}>
                                                    {fullDefaultTemplate.description}
                                                </Typography>
                                            </Box>
                                        )}

                                        {/* Category */}
                                        <Box sx={{ mb: 2 }}>
                                            <Typography
                                                variant='body2'
                                                sx={{ color: 'rgba(255, 193, 7, 0.7)', fontSize: '0.75rem', mb: 0.5 }}
                                            >
                                                CATEGORY
                                            </Typography>
                                            <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                                                {(fullDefaultTemplate.category || 'Uncategorized')
                                                    .split(';')
                                                    .map((category: string, index: number) => (
                                                        <Chip
                                                            key={index}
                                                            label={category.trim()}
                                                            size='small'
                                                            sx={{
                                                                height: 20,
                                                                fontSize: '0.65rem',
                                                                bgcolor: 'rgba(255, 193, 7, 0.2)',
                                                                color: 'rgba(255, 193, 7, 0.9)',
                                                                border: '1px solid rgba(255, 193, 7, 0.4)',
                                                                '& .MuiChip-label': {
                                                                    px: 0.75,
                                                                    py: 0.25
                                                                }
                                                            }}
                                                        />
                                                    ))}
                                            </Box>
                                        </Box>

                                        {/* Owner */}
                                        <Box>
                                            <Typography
                                                variant='body2'
                                                sx={{ color: 'rgba(255, 193, 7, 0.7)', fontSize: '0.75rem', mb: 0.5 }}
                                            >
                                                OWNER
                                            </Typography>
                                            <Typography variant='body2' sx={{ color: 'rgba(255, 255, 255, 0.8)' }}>
                                                {fullDefaultTemplate.isOwner
                                                    ? 'Me'
                                                    : fullDefaultTemplate.user?.name ||
                                                      fullDefaultTemplate.user?.email ||
                                                      fullDefaultTemplate.userId}
                                            </Typography>
                                        </Box>
                                    </Box>

                                    {/* Right Column */}
                                    <Box>
                                        {/* Created Date */}
                                        <Box sx={{ mb: 2 }}>
                                            <Typography
                                                variant='body2'
                                                sx={{ color: 'rgba(255, 193, 7, 0.7)', fontSize: '0.75rem', mb: 0.5 }}
                                            >
                                                CREATED
                                            </Typography>
                                            <Typography variant='body2' sx={{ color: 'rgba(255, 255, 255, 0.8)' }}>
                                                {fullDefaultTemplate.createdDate
                                                    ? format(new Date(fullDefaultTemplate.createdDate), 'MMM d, yyyy h:mm a')
                                                    : 'N/A'}
                                            </Typography>
                                        </Box>

                                        {/* Updated Date */}
                                        <Box sx={{ mb: 2 }}>
                                            <Typography
                                                variant='body2'
                                                sx={{ color: 'rgba(255, 193, 7, 0.7)', fontSize: '0.75rem', mb: 0.5 }}
                                            >
                                                UPDATED
                                            </Typography>
                                            <Typography variant='body2' sx={{ color: 'rgba(255, 255, 255, 0.8)' }}>
                                                {fullDefaultTemplate.updatedDate
                                                    ? format(new Date(fullDefaultTemplate.updatedDate), 'MMM d, yyyy h:mm a')
                                                    : 'N/A'}
                                            </Typography>
                                        </Box>

                                        {/* Version */}
                                        <Box sx={{ mb: 2 }}>
                                            <Typography
                                                variant='body2'
                                                sx={{ color: 'rgba(255, 193, 7, 0.7)', fontSize: '0.75rem', mb: 0.5 }}
                                            >
                                                VERSION
                                            </Typography>
                                            <Typography variant='body2' sx={{ color: 'rgba(255, 255, 255, 0.8)' }}>
                                                v{fullDefaultTemplate.currentVersion || 1}
                                            </Typography>
                                        </Box>

                                        {/* Actions */}
                                        <Box>
                                            <Typography
                                                variant='body2'
                                                sx={{ color: 'rgba(255, 193, 7, 0.7)', fontSize: '0.75rem', mb: 1 }}
                                            >
                                                ACTIONS
                                            </Typography>
                                            <Box sx={{ display: 'flex', gap: 1 }}>
                                                <Tooltip title='View Template' placement='top'>
                                                    <IconButton
                                                        size='small'
                                                        onClick={() => window.open(getCanvasRoute(fullDefaultTemplate), '_blank')}
                                                        sx={{
                                                            color: 'rgba(255, 193, 7, 0.8)',
                                                            bgcolor: 'rgba(255, 193, 7, 0.1)',
                                                            border: '1px solid rgba(255, 193, 7, 0.3)',
                                                            '&:hover': {
                                                                color: 'rgba(255, 193, 7, 0.9)',
                                                                bgcolor: 'rgba(255, 193, 7, 0.2)',
                                                                borderColor: 'rgba(255, 193, 7, 0.5)'
                                                            }
                                                        }}
                                                    >
                                                        <VisibilityIcon fontSize='small' />
                                                    </IconButton>
                                                </Tooltip>
                                                <Tooltip title='View Metrics' placement='top'>
                                                    <IconButton
                                                        size='small'
                                                        onClick={() => handleOpenMetrics(fullDefaultTemplate.id)}
                                                        sx={{
                                                            color: 'rgba(255, 193, 7, 0.8)',
                                                            bgcolor: 'rgba(255, 193, 7, 0.1)',
                                                            border: '1px solid rgba(255, 193, 7, 0.3)',
                                                            '&:hover': {
                                                                color: 'rgba(255, 193, 7, 0.9)',
                                                                bgcolor: 'rgba(255, 193, 7, 0.2)',
                                                                borderColor: 'rgba(255, 193, 7, 0.5)'
                                                            }
                                                        }}
                                                    >
                                                        <BarChartIcon fontSize='small' />
                                                    </IconButton>
                                                </Tooltip>
                                                <Tooltip title='Version History' placement='top'>
                                                    <IconButton
                                                        size='small'
                                                        onClick={() => handleOpenVersions(fullDefaultTemplate.id)}
                                                        sx={{
                                                            color: 'rgba(255, 193, 7, 0.8)',
                                                            bgcolor: 'rgba(255, 193, 7, 0.1)',
                                                            border: '1px solid rgba(255, 193, 7, 0.3)',
                                                            '&:hover': {
                                                                color: 'rgba(255, 193, 7, 0.9)',
                                                                bgcolor: 'rgba(255, 193, 7, 0.2)',
                                                                borderColor: 'rgba(255, 193, 7, 0.5)'
                                                            }
                                                        }}
                                                    >
                                                        <HistoryIcon fontSize='small' />
                                                    </IconButton>
                                                </Tooltip>
                                            </Box>
                                        </Box>
                                    </Box>
                                </Box>
                            </Box>
                        </Box>
                    )
                })()}

            <Box
                sx={{
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: '12px',
                    bgcolor: 'rgba(0, 0, 0, 0.2)',
                    backdropFilter: 'blur(20px)'
                }}
            >
                {/* Collapsible Filter Panel */}
                <Box
                    sx={{
                        maxHeight: isFilterExpanded ? '300px' : '0px',
                        overflow: 'hidden',
                        transition: 'max-height 0.3s ease-in-out',
                        borderBottom: isFilterExpanded ? '1px solid rgba(255, 255, 255, 0.1)' : 'none'
                    }}
                >
                    <Box sx={{ p: 3 }}>
                        <Typography variant='h6' sx={{ color: 'rgba(255, 255, 255, 0.8)', mb: 2 }}>
                            Filter Options
                        </Typography>
                        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 3 }}>
                            {/* Keyword Filter */}
                            <Box>
                                <Typography variant='body2' sx={{ color: 'rgba(255, 255, 255, 0.7)', mb: 1 }}>
                                    Search
                                </Typography>
                                <TextField
                                    size='small'
                                    placeholder='Search by name or description...'
                                    value={keywordFilter}
                                    onChange={(e) => {
                                        setKeywordFilter(e.target.value)
                                        setPage(0)
                                    }}
                                    sx={{
                                        width: '100%',
                                        '& .MuiOutlinedInput-root': {
                                            color: 'rgba(255, 255, 255, 0.7)',
                                            '& fieldset': {
                                                borderColor: 'rgba(255, 255, 255, 0.2)'
                                            },
                                            '&:hover fieldset': {
                                                borderColor: 'rgba(255, 255, 255, 0.3)'
                                            },
                                            '&.Mui-focused fieldset': {
                                                borderColor: 'rgba(255, 255, 255, 0.5)'
                                            }
                                        },
                                        '& .MuiInputBase-input': {
                                            color: 'rgba(255, 255, 255, 0.7)'
                                        }
                                    }}
                                />
                            </Box>

                            {/* Category Filter */}
                            <Box>
                                <Typography variant='body2' sx={{ color: 'rgba(255, 255, 255, 0.7)', mb: 1 }}>
                                    Categories
                                </Typography>
                                <Autocomplete
                                    multiple
                                    size='small'
                                    options={getAllCategories()}
                                    value={selectedCategories}
                                    onChange={(event, newValue) => {
                                        setSelectedCategories(newValue)
                                        setPage(0)
                                    }}
                                    renderInput={(params) => (
                                        <TextField
                                            {...params}
                                            placeholder='Select categories...'
                                            size='small'
                                            sx={{
                                                '& .MuiOutlinedInput-root': {
                                                    color: 'rgba(255, 255, 255, 0.7)',
                                                    '& fieldset': {
                                                        borderColor: 'rgba(255, 255, 255, 0.2)'
                                                    },
                                                    '&:hover fieldset': {
                                                        borderColor: 'rgba(255, 255, 255, 0.3)'
                                                    },
                                                    '&.Mui-focused fieldset': {
                                                        borderColor: 'rgba(255, 255, 255, 0.5)'
                                                    }
                                                },
                                                '& .MuiInputBase-input': {
                                                    color: 'rgba(255, 255, 255, 0.7)'
                                                }
                                            }}
                                        />
                                    )}
                                    sx={{
                                        '& .MuiAutocomplete-tag': {
                                            bgcolor: 'rgba(255, 255, 255, 0.1)',
                                            color: 'rgba(255, 255, 255, 0.7)',
                                            border: '1px solid rgba(255, 255, 255, 0.2)'
                                        },
                                        '& .MuiAutocomplete-popupIndicator': {
                                            color: 'rgba(255, 255, 255, 0.7)'
                                        }
                                    }}
                                />
                            </Box>

                            {/* Owner Filter */}
                            <Box>
                                <Typography variant='body2' sx={{ color: 'rgba(255, 255, 255, 0.7)', mb: 1 }}>
                                    Owners
                                </Typography>
                                <Autocomplete
                                    multiple
                                    size='small'
                                    options={getAllOwners()}
                                    getOptionLabel={(option) => option.label}
                                    value={getAllOwners().filter((owner) => selectedOwners.includes(owner.value))}
                                    onChange={(event, newValue) => {
                                        setSelectedOwners(newValue.map((owner) => owner.value))
                                        setPage(0)
                                    }}
                                    renderInput={(params) => (
                                        <TextField
                                            {...params}
                                            placeholder='Select owners...'
                                            size='small'
                                            sx={{
                                                '& .MuiOutlinedInput-root': {
                                                    color: 'rgba(255, 255, 255, 0.7)',
                                                    '& fieldset': {
                                                        borderColor: 'rgba(255, 255, 255, 0.2)'
                                                    },
                                                    '&:hover fieldset': {
                                                        borderColor: 'rgba(255, 255, 255, 0.3)'
                                                    },
                                                    '&.Mui-focused fieldset': {
                                                        borderColor: 'rgba(255, 255, 255, 0.5)'
                                                    }
                                                },
                                                '& .MuiInputBase-input': {
                                                    color: 'rgba(255, 255, 255, 0.7)'
                                                }
                                            }}
                                        />
                                    )}
                                    sx={{
                                        '& .MuiAutocomplete-tag': {
                                            bgcolor: 'rgba(255, 255, 255, 0.1)',
                                            color: 'rgba(255, 255, 255, 0.7)',
                                            border: '1px solid rgba(255, 255, 255, 0.2)'
                                        },
                                        '& .MuiAutocomplete-popupIndicator': {
                                            color: 'rgba(255, 255, 255, 0.7)'
                                        }
                                    }}
                                />
                            </Box>
                        </Box>

                        {/* Template Filters */}
                        <Box sx={{ mt: 3, pt: 3, borderTop: '1px solid rgba(255, 255, 255, 0.1)' }}>
                            <Typography variant='h6' sx={{ color: 'rgba(255, 255, 255, 0.8)', mb: 2 }}>
                                Template Management
                            </Typography>
                            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 3, alignItems: 'start' }}>
                                {/* Template Only Toggle */}
                                <Box>
                                    <FormControlLabel
                                        control={
                                            <Switch
                                                checked={showTemplateOnly}
                                                onChange={(e) => {
                                                    setShowTemplateOnly(e.target.checked)
                                                    setPage(0)
                                                }}
                                                sx={{
                                                    '& .MuiSwitch-switchBase.Mui-checked': {
                                                        color: 'rgba(255, 193, 7, 0.9)',
                                                        '&:hover': {
                                                            backgroundColor: 'rgba(255, 193, 7, 0.1)'
                                                        }
                                                    },
                                                    '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
                                                        backgroundColor: 'rgba(255, 193, 7, 0.5)'
                                                    }
                                                }}
                                            />
                                        }
                                        label={
                                            <Typography variant='body2' sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>
                                                Show only template-derived chatflows
                                            </Typography>
                                        }
                                    />
                                </Box>

                                {/* Template Status Filter */}
                                <Box>
                                    <Typography variant='body2' sx={{ color: 'rgba(255, 255, 255, 0.7)', mb: 1 }}>
                                        Template Status
                                    </Typography>
                                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                                        {[
                                            { value: 'up_to_date', label: 'Up-to-date', color: 'rgba(76, 175, 80, 0.7)' },
                                            { value: 'outdated', label: 'Outdated', color: 'rgba(255, 152, 0, 0.7)' },
                                            { value: 'not_from_template', label: 'Not from template', color: 'rgba(158, 158, 158, 0.7)' }
                                        ].map((status) => (
                                            <FormControlLabel
                                                key={status.value}
                                                control={
                                                    <Checkbox
                                                        checked={templateStatusFilter.includes(status.value)}
                                                        onChange={(e) => {
                                                            if (e.target.checked) {
                                                                setTemplateStatusFilter([...templateStatusFilter, status.value])
                                                            } else {
                                                                setTemplateStatusFilter(
                                                                    templateStatusFilter.filter((s) => s !== status.value)
                                                                )
                                                            }
                                                            setPage(0)
                                                        }}
                                                        sx={{
                                                            color: status.color,
                                                            '&.Mui-checked': {
                                                                color: status.color
                                                            }
                                                        }}
                                                    />
                                                }
                                                label={
                                                    <Typography
                                                        variant='body2'
                                                        sx={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: '0.8rem' }}
                                                    >
                                                        {status.label}
                                                    </Typography>
                                                }
                                            />
                                        ))}
                                    </Box>
                                </Box>
                            </Box>
                        </Box>
                    </Box>
                </Box>

                {/* Bulk Update Actions */}
                {chatflowsData && chatflowsData.some((chatflow) => chatflow.templateStatus === 'outdated') && (
                    <Box
                        sx={{
                            mb: 2,
                            p: 3,
                            border: '1px solid rgba(255, 152, 0, 0.3)',
                            borderRadius: '8px',
                            bgcolor: 'rgba(255, 152, 0, 0.1)'
                        }}
                    >
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                            <Box>
                                <Typography variant='body1' sx={{ color: 'rgba(255, 152, 0, 0.9)', fontWeight: 600, mb: 0.5 }}>
                                    Template Updates Available
                                </Typography>
                                <Typography variant='body2' sx={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: '0.875rem' }}>
                                    {chatflowsData.filter((chatflow) => chatflow.templateStatus === 'outdated').length} chatflows are
                                    outdated and can be updated to the latest template
                                </Typography>
                            </Box>
                            <Box sx={{ display: 'flex', gap: 2 }}>
                                <Button
                                    variant='outlined'
                                    size='small'
                                    onClick={() => {
                                        const outdatedIds = chatflowsData
                                            .filter((chatflow) => chatflow.templateStatus === 'outdated')
                                            .map((chatflow) => chatflow.id)
                                        setSelectedForUpdate(selectedForUpdate.length === outdatedIds.length ? [] : outdatedIds)
                                    }}
                                    sx={{
                                        color: 'rgba(255, 152, 0, 0.9)',
                                        borderColor: 'rgba(255, 152, 0, 0.3)',
                                        '&:hover': {
                                            borderColor: 'rgba(255, 152, 0, 0.5)',
                                            bgcolor: 'rgba(255, 152, 0, 0.1)'
                                        }
                                    }}
                                >
                                    {selectedForUpdate.length ===
                                    chatflowsData.filter((chatflow) => chatflow.templateStatus === 'outdated').length
                                        ? 'Deselect All'
                                        : 'Select All Outdated'}
                                </Button>
                                <Button
                                    variant='contained'
                                    size='small'
                                    disabled={selectedForUpdate.length === 0}
                                    onClick={async () => {
                                        try {
                                            const response = await chatflowsApi.bulkUpdateChatflows(selectedForUpdate)

                                            // Show success message and refresh data
                                            if (response.updated > 0) {
                                                // Refresh the chatflows data
                                                window.location.reload() // Simple refresh for now
                                            }

                                            // Clear selections
                                            setSelectedForUpdate([])
                                        } catch (error) {
                                            console.error('Bulk update failed:', error)
                                            // TODO: Show error message to user
                                        }
                                    }}
                                    sx={{
                                        bgcolor: 'rgba(255, 152, 0, 0.8)',
                                        color: '#fff',
                                        '&:hover': {
                                            bgcolor: 'rgba(255, 152, 0, 0.9)'
                                        },
                                        '&:disabled': {
                                            bgcolor: 'rgba(255, 152, 0, 0.3)',
                                            color: 'rgba(255, 255, 255, 0.3)'
                                        }
                                    }}
                                >
                                    Update Selected ({selectedForUpdate.length})
                                </Button>
                            </Box>
                        </Box>

                        {selectedForUpdate.length > 0 && (
                            <Box sx={{ p: 2, bgcolor: 'rgba(0, 0, 0, 0.2)', borderRadius: '4px' }}>
                                <Typography variant='body2' sx={{ color: 'rgba(255, 255, 255, 0.8)', fontWeight: 600, mb: 1 }}>
                                    What will be updated:
                                </Typography>
                                <Typography variant='body2' sx={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: '0.8rem' }}>
                                    • Flow configuration and settings will be synced with the latest template
                                    <br />
                                    • API settings, starter prompts, and system configuration will be updated
                                    <br />
                                    • Name, description, owner, and organization will remain unchanged
                                    <br />• User customizations in flow logic may be overwritten
                                </Typography>
                            </Box>
                        )}
                    </Box>
                )}

                <TableContainer>
                    <Table size='small'>
                        <TableHead>
                            <TableRow>
                                <TableCell
                                    sx={{
                                        color: 'rgba(255, 255, 255, 0.7)',
                                        textAlign: 'center',
                                        fontSize: '0.75rem',
                                        py: 1,
                                        width: '40px'
                                    }}
                                >
                                    <Checkbox
                                        size='small'
                                        checked={
                                            chatflowsData &&
                                            selectedForUpdate.length ===
                                                chatflowsData.filter((chatflow) => chatflow.templateStatus === 'outdated').length &&
                                            chatflowsData.filter((chatflow) => chatflow.templateStatus === 'outdated').length > 0
                                        }
                                        indeterminate={
                                            selectedForUpdate.length > 0 &&
                                            chatflowsData &&
                                            selectedForUpdate.length <
                                                chatflowsData.filter((chatflow) => chatflow.templateStatus === 'outdated').length
                                        }
                                        onChange={(e) => {
                                            if (!chatflowsData) return
                                            const outdatedIds = chatflowsData
                                                .filter((chatflow) => chatflow.templateStatus === 'outdated')
                                                .map((chatflow) => chatflow.id)
                                            setSelectedForUpdate(e.target.checked ? outdatedIds : [])
                                        }}
                                        sx={{
                                            color: 'rgba(255, 152, 0, 0.7)',
                                            '&.Mui-checked': {
                                                color: 'rgba(255, 152, 0, 0.9)'
                                            },
                                            '&.MuiCheckbox-indeterminate': {
                                                color: 'rgba(255, 152, 0, 0.9)'
                                            }
                                        }}
                                    />
                                </TableCell>
                                <TableCell sx={{ color: 'rgba(255, 255, 255, 0.7)', textAlign: 'center', fontSize: '0.75rem', py: 1 }}>
                                    <TableSortLabel
                                        active={orderBy === 'name'}
                                        direction={orderBy === 'name' ? order : 'asc'}
                                        onClick={() => handleRequestSort('name')}
                                        sx={{
                                            color: 'rgba(255, 255, 255, 0.7)',
                                            fontSize: '0.75rem',
                                            '&.MuiTableSortLabel-active': {
                                                color: 'rgba(255, 255, 255, 0.9)'
                                            },
                                            '& .MuiTableSortLabel-icon': {
                                                color: 'rgba(255, 255, 255, 0.7)'
                                            }
                                        }}
                                    >
                                        Name
                                    </TableSortLabel>
                                </TableCell>
                                <TableCell sx={{ color: 'rgba(255, 255, 255, 0.7)', textAlign: 'center', fontSize: '0.75rem', py: 1 }}>
                                    Category
                                </TableCell>
                                <TableCell sx={{ color: 'rgba(255, 255, 255, 0.7)', textAlign: 'center', fontSize: '0.75rem', py: 1 }}>
                                    Owner
                                </TableCell>
                                <TableCell sx={{ color: 'rgba(255, 255, 255, 0.7)', textAlign: 'center', fontSize: '0.75rem', py: 1 }}>
                                    <TableSortLabel
                                        active={orderBy === 'createdDate'}
                                        direction={orderBy === 'createdDate' ? order : 'asc'}
                                        onClick={() => handleRequestSort('createdDate')}
                                        sx={{
                                            color: 'rgba(255, 255, 255, 0.7)',
                                            fontSize: '0.75rem',
                                            '&.MuiTableSortLabel-active': {
                                                color: 'rgba(255, 255, 255, 0.9)'
                                            },
                                            '& .MuiTableSortLabel-icon': {
                                                color: 'rgba(255, 255, 255, 0.7)'
                                            }
                                        }}
                                    >
                                        Created
                                    </TableSortLabel>
                                </TableCell>
                                <TableCell sx={{ color: 'rgba(255, 255, 255, 0.7)', textAlign: 'center', fontSize: '0.75rem', py: 1 }}>
                                    <TableSortLabel
                                        active={orderBy === 'updatedDate'}
                                        direction={orderBy === 'updatedDate' ? order : 'asc'}
                                        onClick={() => handleRequestSort('updatedDate')}
                                        sx={{
                                            color: 'rgba(255, 255, 255, 0.7)',
                                            fontSize: '0.75rem',
                                            '&.MuiTableSortLabel-active': {
                                                color: 'rgba(255, 255, 255, 0.9)'
                                            },
                                            '& .MuiTableSortLabel-icon': {
                                                color: 'rgba(255, 255, 255, 0.7)'
                                            }
                                        }}
                                    >
                                        Updated
                                    </TableSortLabel>
                                </TableCell>
                                <TableCell sx={{ color: 'rgba(255, 255, 255, 0.7)', textAlign: 'center', fontSize: '0.75rem', py: 1 }}>
                                    Template Status
                                </TableCell>
                                <TableCell sx={{ color: 'rgba(255, 255, 255, 0.7)', textAlign: 'center', fontSize: '0.75rem', py: 1 }}>
                                    Version
                                </TableCell>
                                <TableCell sx={{ color: 'rgba(255, 255, 255, 0.7)', textAlign: 'center', fontSize: '0.75rem', py: 1 }}>
                                    Actions
                                </TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {getAllChatflowsApiLoading ? (
                                // Skeleton rows during loading
                                Array.from({ length: 5 }).map((_, index) => <SkeletonRow key={index} />)
                            ) : !chatflowsData || chatflowsData.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={8} align='center' sx={{ color: 'rgba(255, 255, 255, 0.5)' }}>
                                        No chatflows found.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                filterData(sortData(chatflowsData))
                                    .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                                    .map((chatflow: any) => (
                                        <TableRow key={chatflow.id} hover sx={{ '&:hover': { bgcolor: 'rgba(255, 255, 255, 0.03)' } }}>
                                            <TableCell sx={{ py: 1, px: 1, width: '40px' }}>
                                                {chatflow.templateStatus === 'outdated' && (
                                                    <Checkbox
                                                        size='small'
                                                        checked={selectedForUpdate.includes(chatflow.id)}
                                                        onChange={(e) => {
                                                            if (e.target.checked) {
                                                                setSelectedForUpdate([...selectedForUpdate, chatflow.id])
                                                            } else {
                                                                setSelectedForUpdate(selectedForUpdate.filter((id) => id !== chatflow.id))
                                                            }
                                                        }}
                                                        sx={{
                                                            color: 'rgba(255, 152, 0, 0.7)',
                                                            '&.Mui-checked': {
                                                                color: 'rgba(255, 152, 0, 0.9)'
                                                            }
                                                        }}
                                                    />
                                                )}
                                            </TableCell>
                                            <TableCell sx={{ py: 1, px: 1 }}>
                                                <Box>
                                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.25 }}>
                                                        <Typography
                                                            sx={{
                                                                color: 'rgba(255, 255, 255, 0.9)',
                                                                cursor: 'pointer',
                                                                fontSize: '0.875rem',
                                                                '&:hover': {
                                                                    color: 'rgba(255, 255, 255, 1)',
                                                                    textDecoration: 'underline'
                                                                }
                                                            }}
                                                        >
                                                            <Link to={getCanvasRoute(chatflow)} target='_blank' rel='noopener noreferrer'>
                                                                {chatflow.name}
                                                            </Link>
                                                        </Typography>
                                                        {defaultTemplateData && chatflow.id === defaultTemplateData.id && (
                                                            <Chip
                                                                label='DEFAULT TEMPLATE'
                                                                size='small'
                                                                sx={{
                                                                    bgcolor: 'rgba(255, 193, 7, 0.2)',
                                                                    color: 'rgba(255, 193, 7, 0.9)',
                                                                    border: '1px solid rgba(255, 193, 7, 0.3)',
                                                                    fontSize: '0.65rem',
                                                                    height: '18px',
                                                                    fontWeight: 600
                                                                }}
                                                            />
                                                        )}
                                                    </Box>
                                                    {chatflow.description && (
                                                        <Typography
                                                            variant='body2'
                                                            sx={{
                                                                color: 'rgba(255, 255, 255, 0.5)',
                                                                fontSize: '0.7rem',
                                                                mt: 0.25
                                                            }}
                                                        >
                                                            {chatflow.description}
                                                        </Typography>
                                                    )}
                                                </Box>
                                            </TableCell>
                                            <TableCell sx={{ textAlign: 'center', py: 1, px: 1 }}>
                                                <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', justifyContent: 'center' }}>
                                                    {(chatflow.category || 'Uncategorized')
                                                        .split(';')
                                                        .map((category: string, index: number) => (
                                                            <Chip
                                                                key={index}
                                                                label={category.trim()}
                                                                size='small'
                                                                sx={{
                                                                    height: 16,
                                                                    fontSize: '0.6rem',
                                                                    bgcolor: 'rgba(255, 255, 255, 0.1)',
                                                                    color: 'rgba(255, 255, 255, 0.7)',
                                                                    border: '1px solid rgba(255, 255, 255, 0.2)',
                                                                    '& .MuiChip-label': {
                                                                        px: 0.5,
                                                                        py: 0.125
                                                                    }
                                                                }}
                                                            />
                                                        ))}
                                                </Box>
                                            </TableCell>
                                            <TableCell
                                                sx={{
                                                    color: 'rgba(255, 255, 255, 0.7)',
                                                    textAlign: 'center',
                                                    fontSize: '0.75rem',
                                                    py: 1,
                                                    px: 1
                                                }}
                                            >
                                                {chatflow.isOwner ? 'Me' : chatflow.user?.name || chatflow.user?.email || chatflow.userId}
                                            </TableCell>
                                            <TableCell
                                                sx={{
                                                    color: 'rgba(255, 255, 255, 0.7)',
                                                    textAlign: 'center',
                                                    fontSize: '0.75rem',
                                                    py: 1,
                                                    px: 1
                                                }}
                                            >
                                                {format(new Date(chatflow.createdDate), 'MMM d, yyyy')}
                                            </TableCell>
                                            <TableCell
                                                sx={{
                                                    color: 'rgba(255, 255, 255, 0.7)',
                                                    textAlign: 'center',
                                                    fontSize: '0.75rem',
                                                    py: 1,
                                                    px: 1
                                                }}
                                            >
                                                {format(new Date(chatflow.updatedDate), 'MMM d, yyyy')}
                                            </TableCell>
                                            <TableCell sx={{ textAlign: 'center', py: 1, px: 1 }}>
                                                {chatflow.templateStatus === 'up_to_date' && (
                                                    <Chip
                                                        label='Up-to-date'
                                                        size='small'
                                                        sx={{
                                                            bgcolor: 'rgba(76, 175, 80, 0.2)',
                                                            color: 'rgba(76, 175, 80, 0.9)',
                                                            border: '1px solid rgba(76, 175, 80, 0.3)',
                                                            fontSize: '0.65rem',
                                                            height: '20px'
                                                        }}
                                                    />
                                                )}
                                                {chatflow.templateStatus === 'outdated' && (
                                                    <Chip
                                                        label='Outdated'
                                                        size='small'
                                                        sx={{
                                                            bgcolor: 'rgba(255, 152, 0, 0.2)',
                                                            color: 'rgba(255, 152, 0, 0.9)',
                                                            border: '1px solid rgba(255, 152, 0, 0.3)',
                                                            fontSize: '0.65rem',
                                                            height: '20px'
                                                        }}
                                                    />
                                                )}
                                                {chatflow.templateStatus === 'not_from_template' && (
                                                    <Chip
                                                        label='Not from template'
                                                        size='small'
                                                        sx={{
                                                            bgcolor: 'rgba(158, 158, 158, 0.2)',
                                                            color: 'rgba(158, 158, 158, 0.9)',
                                                            border: '1px solid rgba(158, 158, 158, 0.3)',
                                                            fontSize: '0.65rem',
                                                            height: '20px'
                                                        }}
                                                    />
                                                )}
                                                {chatflow.parentTemplate && (
                                                    <Typography
                                                        variant='caption'
                                                        sx={{
                                                            display: 'block',
                                                            color: 'rgba(255, 255, 255, 0.5)',
                                                            fontSize: '0.6rem',
                                                            mt: 0.5
                                                        }}
                                                    >
                                                        From: {chatflow.parentTemplate.name}
                                                    </Typography>
                                                )}
                                            </TableCell>
                                            <TableCell sx={{ textAlign: 'center', py: 1, px: 1 }}>
                                                <Typography
                                                    variant='body2'
                                                    sx={{
                                                        color: 'rgba(255, 255, 255, 0.7)',
                                                        fontSize: '0.75rem'
                                                    }}
                                                >
                                                    v{chatflow.currentVersion || 1}
                                                </Typography>
                                            </TableCell>
                                            <TableCell sx={{ textAlign: 'center', py: 1, px: 1 }}>
                                                <Box sx={{ display: 'flex', gap: 1, justifyContent: 'center' }}>
                                                    <Tooltip title='View Chatflow' placement='top'>
                                                        <IconButton
                                                            size='small'
                                                            onClick={() => window.open(getCanvasFullUrl(chatflow), '_blank')}
                                                            sx={{
                                                                color: 'rgba(255, 255, 255, 0.7)',
                                                                '&:hover': { color: 'rgba(255, 255, 255, 0.9)' }
                                                            }}
                                                        >
                                                            <VisibilityIcon fontSize='small' />
                                                        </IconButton>
                                                    </Tooltip>
                                                    <Tooltip title='View Metrics' placement='top'>
                                                        <IconButton
                                                            size='small'
                                                            onClick={() => handleOpenMetrics(chatflow.id)}
                                                            sx={{
                                                                color: 'rgba(255, 255, 255, 0.7)',
                                                                '&:hover': { color: 'rgba(255, 255, 255, 0.9)' }
                                                            }}
                                                        >
                                                            <BarChartIcon fontSize='small' />
                                                        </IconButton>
                                                    </Tooltip>
                                                    <Tooltip title='Version History' placement='top'>
                                                        <IconButton
                                                            size='small'
                                                            onClick={() => handleOpenVersions(chatflow.id)}
                                                            sx={{
                                                                color: 'rgba(255, 255, 255, 0.7)',
                                                                '&:hover': { color: 'rgba(255, 255, 255, 0.9)' }
                                                            }}
                                                        >
                                                            <HistoryIcon fontSize='small' />
                                                        </IconButton>
                                                    </Tooltip>
                                                </Box>
                                            </TableCell>
                                        </TableRow>
                                    ))
                            )}
                        </TableBody>
                    </Table>
                </TableContainer>
                {chatflowsData && chatflowsData.length > 0 && (
                    <TablePagination
                        component='div'
                        count={chatflowsData.length}
                        page={page}
                        onPageChange={handleChangePage}
                        rowsPerPage={rowsPerPage}
                        onRowsPerPageChange={handleChangeRowsPerPage}
                        rowsPerPageOptions={[5, 10, 25, 50]}
                        sx={{
                            color: 'rgba(255, 255, 255, 0.7)',
                            borderTop: '1px solid rgba(255, 255, 255, 0.1)',
                            '& .MuiTablePagination-selectLabel, & .MuiTablePagination-displayedRows': {
                                color: 'rgba(255, 255, 255, 0.7)'
                            },
                            '& .MuiTablePagination-select': {
                                color: 'rgba(255, 255, 255, 0.7)'
                            },
                            '& .MuiTablePagination-selectIcon': {
                                color: 'rgba(255, 255, 255, 0.7)'
                            },
                            '& .MuiIconButton-root': {
                                color: 'rgba(255, 255, 255, 0.7)',
                                '&:hover': {
                                    color: 'rgba(255, 255, 255, 0.9)'
                                },
                                '&.Mui-disabled': {
                                    color: 'rgba(255, 255, 255, 0.3)'
                                }
                            }
                        }}
                    />
                )}
            </Box>

            {/* Metrics Modal */}
            <Dialog
                open={metricsModalOpen}
                onClose={handleCloseMetrics}
                maxWidth='xl'
                fullWidth
                PaperProps={{
                    sx: {
                        height: '95vh',
                        bgcolor: 'rgba(0, 0, 0, 0.9)',
                        backdropFilter: 'blur(20px)',
                        border: '1px solid rgba(255, 255, 255, 0.1)'
                    }
                }}
            >
                <DialogTitle
                    sx={{
                        color: 'rgba(255, 255, 255, 0.9)',
                        borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
                        bgcolor: 'rgba(0, 0, 0, 0.2)'
                    }}
                >
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Typography variant='h6'>Chatflow Metrics</Typography>
                        <Button
                            onClick={handleCloseMetrics}
                            sx={{
                                color: 'rgba(255, 255, 255, 0.7)',
                                '&:hover': { color: 'rgba(255, 255, 255, 0.9)' }
                            }}
                        >
                            Close
                        </Button>
                    </Box>
                </DialogTitle>
                <DialogContent sx={{ p: 0, bgcolor: 'transparent' }}>
                    {selectedChatflowId && (
                        <Box sx={{ height: '100%', overflow: 'hidden' }}>
                            <Metrics chatflowId={selectedChatflowId} />
                        </Box>
                    )}
                </DialogContent>
            </Dialog>

            {/* Version History Modal */}
            <Dialog
                open={versionModalOpen}
                onClose={handleCloseVersions}
                maxWidth='md'
                fullWidth
                PaperProps={{
                    sx: {
                        bgcolor: 'rgba(0, 0, 0, 0.9)',
                        backdropFilter: 'blur(20px)',
                        border: '1px solid rgba(255, 255, 255, 0.1)'
                    }
                }}
            >
                <DialogTitle
                    sx={{
                        color: 'rgba(255, 255, 255, 0.9)',
                        borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
                        bgcolor: 'rgba(0, 0, 0, 0.2)'
                    }}
                >
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Typography variant='h6'>Version History</Typography>
                        <Button
                            onClick={handleCloseVersions}
                            sx={{
                                color: 'rgba(255, 255, 255, 0.7)',
                                '&:hover': { color: 'rgba(255, 255, 255, 0.9)' }
                            }}
                        >
                            Close
                        </Button>
                    </Box>
                </DialogTitle>
                <DialogContent sx={{ p: 3 }}>
                    {chatflowVersions.length > 0 ? (
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                            {chatflowVersions.map((version: any) => (
                                <Box
                                    key={version.version}
                                    sx={{
                                        p: 2,
                                        border: version.isCurrent
                                            ? '2px solid rgba(76, 175, 80, 0.6)'
                                            : '1px solid rgba(255, 255, 255, 0.2)',
                                        borderRadius: '8px',
                                        bgcolor: version.isCurrent ? 'rgba(76, 175, 80, 0.1)' : 'rgba(255, 255, 255, 0.05)',
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center',
                                        position: 'relative'
                                    }}
                                >
                                    <Box>
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                                            <Typography variant='body1' sx={{ color: 'rgba(255, 255, 255, 0.9)', fontWeight: 600 }}>
                                                Version {version.version}
                                            </Typography>
                                            {version.isCurrent && (
                                                <Box
                                                    sx={{
                                                        px: 1,
                                                        py: 0.25,
                                                        bgcolor: 'rgba(76, 175, 80, 0.8)',
                                                        borderRadius: '12px',
                                                        fontSize: '0.75rem',
                                                        fontWeight: 600,
                                                        color: 'white'
                                                    }}
                                                >
                                                    CURRENT
                                                </Box>
                                            )}
                                        </Box>
                                        <Typography variant='body2' sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>
                                            {version.timestamp && format(new Date(version.timestamp), 'MMM d, yyyy h:mm a')}
                                        </Typography>
                                        {version.user && (
                                            <Typography variant='body2' sx={{ color: 'rgba(255, 255, 255, 0.6)', mt: 0.5 }}>
                                                By: {version.user.name}
                                                {version.user.email && ` (${version.user.email})`}
                                            </Typography>
                                        )}
                                        {version.metadata?.isRollback && (
                                            <Typography
                                                variant='caption'
                                                sx={{
                                                    color: 'rgba(255, 193, 7, 0.8)',
                                                    mt: 0.5,
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: 0.5,
                                                    fontStyle: 'italic'
                                                }}
                                            >
                                                ↩ Rolled back from version {version.metadata.rolledBackFromVersion}
                                            </Typography>
                                        )}
                                    </Box>
                                    <Button
                                        variant='outlined'
                                        size='small'
                                        startIcon={<RestoreIcon />}
                                        disabled={version.isCurrent}
                                        onClick={() => {
                                            setSelectedVersionForRollback(version.version)
                                            setRollbackConfirmOpen(true)
                                        }}
                                        sx={{
                                            color: version.isCurrent ? 'rgba(255, 255, 255, 0.4)' : 'rgba(255, 255, 255, 0.7)',
                                            borderColor: version.isCurrent ? 'rgba(255, 255, 255, 0.1)' : 'rgba(255, 255, 255, 0.3)',
                                            '&:hover': version.isCurrent
                                                ? {}
                                                : {
                                                      borderColor: 'rgba(255, 255, 255, 0.5)',
                                                      bgcolor: 'rgba(255, 255, 255, 0.1)'
                                                  },
                                            '&.Mui-disabled': {
                                                color: 'rgba(255, 255, 255, 0.3)',
                                                borderColor: 'rgba(255, 255, 255, 0.1)'
                                            }
                                        }}
                                    >
                                        {version.isCurrent ? 'Current' : 'Rollback'}
                                    </Button>
                                </Box>
                            ))}
                        </Box>
                    ) : (
                        <Typography sx={{ color: 'rgba(255, 255, 255, 0.7)', textAlign: 'center', py: 4 }}>
                            No versions found for this chatflow.
                        </Typography>
                    )}
                </DialogContent>
            </Dialog>

            {/* Rollback Confirmation Dialog */}
            <Dialog
                open={rollbackConfirmOpen}
                onClose={() => setRollbackConfirmOpen(false)}
                maxWidth='sm'
                fullWidth
                PaperProps={{
                    sx: {
                        bgcolor: 'rgba(0, 0, 0, 0.9)',
                        backdropFilter: 'blur(20px)',
                        border: '1px solid rgba(255, 255, 255, 0.1)'
                    }
                }}
            >
                <DialogTitle sx={{ color: 'rgba(255, 255, 255, 0.9)' }}>Confirm Rollback</DialogTitle>
                <DialogContent>
                    <Typography sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>
                        Are you sure you want to rollback to version {selectedVersionForRollback}? This action cannot be undone and will
                        create a new version with the selected version&apos;s content.
                    </Typography>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setRollbackConfirmOpen(false)} sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>
                        Cancel
                    </Button>
                    <Button
                        onClick={handleRollbackConfirm}
                        variant='contained'
                        sx={{
                            bgcolor: 'rgba(244, 67, 54, 0.8)',
                            color: '#fff',
                            '&:hover': {
                                bgcolor: 'rgba(244, 67, 54, 0.9)'
                            }
                        }}
                    >
                        Rollback
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    )
}

export default AdminChatflows
