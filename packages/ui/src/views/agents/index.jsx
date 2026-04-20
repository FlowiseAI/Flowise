import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import moment from 'moment'
import Avatar from 'boring-avatars'

// material-ui
import {
    Box,
    Chip,
    Fade,
    IconButton,
    InputAdornment,
    OutlinedInput,
    Paper,
    Skeleton,
    Stack,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    TableSortLabel,
    ToggleButton,
    ToggleButtonGroup,
    Tooltip,
    Typography
} from '@mui/material'
import { useTheme, styled, darken } from '@mui/material/styles'
import { tableCellClasses } from '@mui/material/TableCell'
import { useSelector } from 'react-redux'

// project imports
import MainCard from '@/ui-component/cards/MainCard'
import { baseURL, gridSpacing } from '@/store/constant'
import ErrorBoundary from '@/ErrorBoundary'
import { StyledPermissionButton } from '@/ui-component/button/RBACButtons'
import AgentListMenu from '@/ui-component/button/AgentListMenu'
import ConfirmDialog from '@/ui-component/dialog/ConfirmDialog'
import TablePagination, { DEFAULT_ITEMS_PER_PAGE } from '@/ui-component/pagination/TablePagination'

// API
import chatflowsApi from '@/api/chatflows'

// Hooks
import useApi from '@/hooks/useApi'

// icons
import { IconArrowUp, IconLayoutGrid, IconList, IconSearch } from '@tabler/icons-react'

// ==============================|| CONSTANTS ||============================== //

const SUGGESTION_CHIPS = ['Trip planner', 'Image generator', 'Code debugger', 'Research assistant', 'Decision helper']

// ==============================|| HELPERS ||============================== //

const parseAgentFromFlowData = (agent) => {
    try {
        if (!agent.flowData) return { name: agent.name, instruction: '', modelName: '' }
        const flowData = JSON.parse(agent.flowData)
        const agentNode = flowData.nodes?.find((n) => n.data?.name === 'agentAgentflow')
        if (agentNode) {
            const inputs = agentNode.data?.inputs || {}
            const instruction = inputs.agentMessages?.[0]?.content || ''
            const modelName = inputs.agentModel || ''
            return { name: agent.name, instruction, modelName }
        }
        const toolAgentNode = flowData.nodes?.find((n) => n.data?.name === 'toolAgent')
        if (toolAgentNode) {
            const instruction = toolAgentNode.data?.inputs?.systemMessage || ''
            const chatModelNode = flowData.nodes?.find((n) => n.data?.category === 'Chat Models')
            const modelName = chatModelNode?.data?.name || ''
            return { name: agent.name, instruction, modelName }
        }
        return { name: agent.name, instruction: '', modelName: '' }
    } catch {
        return { name: agent.name || 'Untitled', instruction: '', modelName: '' }
    }
}

// ==============================|| STYLED COMPONENTS ||============================== //

const StyledTableCell = styled(TableCell)(({ theme }) => ({
    borderColor: theme.palette.grey[900] + 25,
    [`&.${tableCellClasses.head}`]: {
        color: theme.palette.grey[900]
    },
    [`&.${tableCellClasses.body}`]: {
        fontSize: 14,
        height: 64
    }
}))

const StyledTableRow = styled(TableRow)(() => ({
    '&:last-child td, &:last-child th': {
        border: 0
    }
}))

// ==============================|| AGENTS ||============================== //

const Agents = () => {
    const navigate = useNavigate()
    const theme = useTheme()
    const customization = useSelector((state) => state.customization)

    const getAllAgentsApi = useApi(chatflowsApi.getAllAgentflows)

    const [isLoading, setLoading] = useState(true)
    const [error, setError] = useState(null)
    const [agents, setAgents] = useState([])
    const [total, setTotal] = useState(0)

    const [search, setSearch] = useState('')
    const [generateInput, setGenerateInput] = useState('')
    const [view, setView] = useState(localStorage.getItem('agentDisplayStyle') || 'card')
    const [order, setOrder] = useState(localStorage.getItem('agent_order') || 'desc')
    const [orderBy, setOrderBy] = useState(localStorage.getItem('agent_orderBy') || 'updatedDate')
    const [currentPage, setCurrentPage] = useState(1)
    const [pageLimit, setPageLimit] = useState(() => Number(localStorage.getItem('agentPageSize') || DEFAULT_ITEMS_PER_PAGE))

    const onSearchChange = (event) => {
        setSearch(event.target.value)
    }

    const handleChange = (event, nextView) => {
        if (nextView === null) return
        localStorage.setItem('agentDisplayStyle', nextView)
        setView(nextView)
    }

    const handleRequestSort = (property) => {
        const isAsc = orderBy === property && order === 'asc'
        const newOrder = isAsc ? 'desc' : 'asc'
        setOrder(newOrder)
        setOrderBy(property)
        localStorage.setItem('agent_order', newOrder)
        localStorage.setItem('agent_orderBy', property)
    }

    const addNew = () => {
        navigate('/agents/new')
    }

    const handleGenerate = (taskText) => {
        const task = taskText || generateInput
        if (!task.trim()) return
        navigate('/agents/new', { state: { generateTask: task.trim() } })
    }

    const handleGenerateKeyDown = (e) => {
        if (e.key === 'Enter') {
            e.preventDefault()
            handleGenerate()
        }
    }

    function filterAgents(agent) {
        if (!search) return true
        return agent.name && agent.name.toLowerCase().indexOf(search.toLowerCase()) > -1
    }

    const getImages = (agent) => {
        const images = []
        const parsed = parseAgentFromFlowData(agent)
        if (parsed.modelName) {
            images.push({ imageSrc: `${baseURL}/api/v1/node-icon/${parsed.modelName}` })
        }
        return images
    }

    const getInstruction = (agent) => {
        return parseAgentFromFlowData(agent).instruction
    }

    const getModelName = (agent) => {
        return parseAgentFromFlowData(agent).modelName
    }

    const getSortedData = (data) => {
        if (!data) return []
        return [...data].filter(filterAgents).sort((a, b) => {
            if (orderBy === 'name') {
                return order === 'asc' ? (a.name || '').localeCompare(b.name || '') : (b.name || '').localeCompare(a.name || '')
            } else if (orderBy === 'updatedDate') {
                return order === 'asc'
                    ? new Date(a.updatedDate) - new Date(b.updatedDate)
                    : new Date(b.updatedDate) - new Date(a.updatedDate)
            }
            return 0
        })
    }

    const refreshAgents = (page, limit) => {
        const params = { page: page || currentPage, limit: limit || pageLimit }
        getAllAgentsApi.request('AGENT', params)
    }

    const onPageChange = (page, limit) => {
        setCurrentPage(page)
        setPageLimit(limit)
        localStorage.setItem('agentPageSize', limit)
        refreshAgents(page, limit)
    }

    useEffect(() => {
        refreshAgents(currentPage, pageLimit)
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    useEffect(() => {
        setLoading(getAllAgentsApi.loading)
    }, [getAllAgentsApi.loading])

    useEffect(() => {
        if (getAllAgentsApi.error) setError(getAllAgentsApi.error)
    }, [getAllAgentsApi.error])

    useEffect(() => {
        if (getAllAgentsApi.data) {
            const agentList = getAllAgentsApi.data?.data || getAllAgentsApi.data || []
            setAgents(agentList)
            setTotal(getAllAgentsApi.data?.total ?? agentList.length)
        }
    }, [getAllAgentsApi.data])

    return (
        <>
            <MainCard>
                {error ? (
                    <ErrorBoundary error={error} />
                ) : (
                    <Fade in={!isLoading} timeout={250} style={{ transitionDelay: isLoading ? '0ms' : '50ms' }}>
                        <Stack flexDirection='column' sx={{ gap: 3 }}>
                            {/* ==================== Hero Section ==================== */}
                            <Box
                                sx={{
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    pt: 4,
                                    pb: 2,
                                    ...(!isLoading && total === 0 ? { minHeight: 'calc(100vh - 200px)' } : {})
                                }}
                            >
                                <Typography
                                    variant='h2'
                                    sx={{
                                        fontSize: '1.8rem',
                                        fontWeight: 700,
                                        mb: 3,
                                        color: theme.palette.text.primary
                                    }}
                                >
                                    Create an agent
                                </Typography>

                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                                    <StyledPermissionButton
                                        permissionId={'agents:create'}
                                        variant='contained'
                                        onClick={addNew}
                                        sx={{
                                            borderRadius: '24px',
                                            px: 3,
                                            height: 44,
                                            textTransform: 'none',
                                            fontSize: '0.95rem',
                                            fontWeight: 600,
                                            background: `linear-gradient(90deg, ${theme.palette.primary.main} 10%, ${theme.palette.secondary.main} 100%)`,
                                            color: theme.palette.common.white,
                                            '&:hover': {
                                                background: `linear-gradient(90deg, ${darken(
                                                    theme.palette.primary.main,
                                                    0.1
                                                )} 10%, ${darken(theme.palette.secondary.main, 0.1)} 100%)`
                                            }
                                        }}
                                    >
                                        Create Manually
                                    </StyledPermissionButton>

                                    <OutlinedInput
                                        size='small'
                                        placeholder='Generate...'
                                        value={generateInput}
                                        onChange={(e) => setGenerateInput(e.target.value)}
                                        onKeyDown={handleGenerateKeyDown}
                                        endAdornment={
                                            <InputAdornment position='end'>
                                                <IconButton
                                                    size='small'
                                                    onClick={() => handleGenerate()}
                                                    disabled={!generateInput.trim()}
                                                    sx={{
                                                        backgroundColor: generateInput.trim()
                                                            ? customization.isDarkMode
                                                                ? theme.palette.common.white
                                                                : theme.palette.common.black
                                                            : 'transparent',
                                                        color: generateInput.trim()
                                                            ? customization.isDarkMode
                                                                ? theme.palette.common.black
                                                                : theme.palette.common.white
                                                            : theme.palette.text.secondary,
                                                        borderRadius: '50%',
                                                        width: 28,
                                                        height: 28,
                                                        '&:hover': {
                                                            backgroundColor: generateInput.trim()
                                                                ? customization.isDarkMode
                                                                    ? theme.palette.grey[200]
                                                                    : theme.palette.grey[800]
                                                                : theme.palette.action.hover
                                                        }
                                                    }}
                                                >
                                                    <IconArrowUp size={16} />
                                                </IconButton>
                                            </InputAdornment>
                                        }
                                        sx={{
                                            borderRadius: '24px',
                                            height: 44,
                                            width: 200,
                                            overflow: 'hidden',
                                            '& .MuiOutlinedInput-notchedOutline': {
                                                borderColor: theme.palette.grey[900] + 25,
                                                borderRadius: '24px'
                                            }
                                        }}
                                    />
                                </Box>

                                <Box sx={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 1, mt: 2.5 }}>
                                    {SUGGESTION_CHIPS.map((label) => (
                                        <Chip
                                            key={label}
                                            label={label}
                                            variant='outlined'
                                            size='small'
                                            onClick={() => handleGenerate(label)}
                                            sx={{
                                                borderRadius: '16px',
                                                cursor: 'pointer',
                                                fontWeight: 500,
                                                borderColor: theme.palette.grey[900] + 25,
                                                color: theme.palette.text.primary,
                                                '&:hover': {
                                                    backgroundColor: customization.isDarkMode
                                                        ? 'rgba(255,255,255,0.08)'
                                                        : 'rgba(0,0,0,0.04)'
                                                }
                                            }}
                                        />
                                    ))}
                                </Box>
                            </Box>

                            {/* ==================== Agents Listing Section ==================== */}
                            {total > 0 && (
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <Typography variant='h3' sx={{ fontWeight: 600, color: theme.palette.text.primary }}>
                                        Agents
                                    </Typography>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                        <OutlinedInput
                                            size='small'
                                            placeholder='Search Agents'
                                            onChange={onSearchChange}
                                            startAdornment={
                                                <InputAdornment position='start'>
                                                    <IconSearch size={16} stroke={1.5} />
                                                </InputAdornment>
                                            }
                                            sx={{
                                                width: 250,
                                                borderRadius: 2,
                                                '& .MuiOutlinedInput-notchedOutline': {
                                                    borderColor: theme.palette.grey[900] + 25
                                                }
                                            }}
                                        />
                                        <ToggleButtonGroup
                                            sx={{ borderRadius: 2, maxHeight: 36 }}
                                            value={view}
                                            color='primary'
                                            disabled={total === 0}
                                            exclusive
                                            onChange={handleChange}
                                        >
                                            <ToggleButton
                                                sx={{
                                                    borderColor: theme.palette.grey[900] + 25,
                                                    borderRadius: 2,
                                                    color: customization.isDarkMode ? 'white' : 'inherit'
                                                }}
                                                variant='contained'
                                                value='card'
                                                title='Card View'
                                            >
                                                <IconLayoutGrid size={18} />
                                            </ToggleButton>
                                            <ToggleButton
                                                sx={{
                                                    borderColor: theme.palette.grey[900] + 25,
                                                    borderRadius: 2,
                                                    color: customization.isDarkMode ? 'white' : 'inherit'
                                                }}
                                                variant='contained'
                                                value='list'
                                                title='List View'
                                            >
                                                <IconList size={18} />
                                            </ToggleButton>
                                        </ToggleButtonGroup>
                                    </Box>
                                </Box>
                            )}

                            {isLoading && (
                                <Box display='grid' gridTemplateColumns='repeat(3, minmax(0, 1fr))' gap={gridSpacing}>
                                    <Skeleton variant='rounded' height={80} sx={{ borderRadius: 3 }} />
                                    <Skeleton variant='rounded' height={80} sx={{ borderRadius: 3 }} />
                                    <Skeleton variant='rounded' height={80} sx={{ borderRadius: 3 }} />
                                </Box>
                            )}

                            {!isLoading && total > 0 && (
                                <>
                                    {!view || view === 'card' ? (
                                        <Box display='grid' gridTemplateColumns='repeat(3, minmax(0, 1fr))' gap={gridSpacing}>
                                            {getSortedData(agents).map((agent, index) => (
                                                <Box
                                                    key={index}
                                                    onClick={() => navigate(`/agents/${agent.id}`)}
                                                    sx={{
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        gap: 1.5,
                                                        p: 2,
                                                        borderRadius: 3,
                                                        border: `1px solid ${theme.palette.grey[900]}15`,
                                                        cursor: 'pointer',
                                                        backgroundColor: theme.palette.card?.main || theme.palette.background.paper,
                                                        boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
                                                        transition: 'background-color 0.2s, box-shadow 0.2s',
                                                        '&:hover': {
                                                            backgroundColor: theme.palette.card?.hover || theme.palette.action.hover,
                                                            boxShadow: '0 4px 20px rgba(0,0,0,0.12)'
                                                        }
                                                    }}
                                                >
                                                    <Box
                                                        sx={{
                                                            width: 36,
                                                            height: 36,
                                                            borderRadius: 2,
                                                            overflow: 'hidden',
                                                            flexShrink: 0
                                                        }}
                                                    >
                                                        <Avatar
                                                            size={36}
                                                            name={agent.id || agent.name || 'agent'}
                                                            variant='marble'
                                                            colors={[
                                                                theme.palette.primary.light,
                                                                theme.palette.primary.main,
                                                                theme.palette.primary.dark,
                                                                theme.palette.secondary.light,
                                                                theme.palette.secondary.main,
                                                                theme.palette.secondary.dark
                                                            ]}
                                                        />
                                                    </Box>
                                                    <Box sx={{ overflow: 'hidden' }}>
                                                        <Typography
                                                            sx={{
                                                                fontSize: '0.95rem',
                                                                fontWeight: 500,
                                                                overflow: 'hidden',
                                                                textOverflow: 'ellipsis',
                                                                whiteSpace: 'nowrap',
                                                                color: theme.palette.text.primary
                                                            }}
                                                        >
                                                            {agent.name || 'Untitled'}
                                                        </Typography>
                                                        <Typography
                                                            sx={{
                                                                fontSize: '0.8rem',
                                                                color: theme.palette.text.secondary
                                                            }}
                                                        >
                                                            {moment(agent.updatedDate).format('MMM D, hh:mm A')}
                                                        </Typography>
                                                    </Box>
                                                </Box>
                                            ))}
                                        </Box>
                                    ) : (
                                        <TableContainer
                                            sx={{ border: 1, borderColor: theme.palette.grey[900] + 25, borderRadius: 2 }}
                                            component={Paper}
                                        >
                                            <Table sx={{ minWidth: 650 }} size='small' aria-label='agents table'>
                                                <TableHead
                                                    sx={{
                                                        backgroundColor: customization.isDarkMode
                                                            ? theme.palette.common.black
                                                            : theme.palette.grey[100],
                                                        height: 56
                                                    }}
                                                >
                                                    <TableRow>
                                                        <StyledTableCell style={{ width: '30%' }}>
                                                            <TableSortLabel
                                                                active={orderBy === 'name'}
                                                                direction={order}
                                                                onClick={() => handleRequestSort('name')}
                                                            >
                                                                Name
                                                            </TableSortLabel>
                                                        </StyledTableCell>
                                                        <StyledTableCell style={{ width: '10%' }}>Model</StyledTableCell>
                                                        <StyledTableCell style={{ width: '35%' }}>Instruction</StyledTableCell>
                                                        <StyledTableCell style={{ width: '15%' }}>
                                                            <TableSortLabel
                                                                active={orderBy === 'updatedDate'}
                                                                direction={order}
                                                                onClick={() => handleRequestSort('updatedDate')}
                                                            >
                                                                Last Modified
                                                            </TableSortLabel>
                                                        </StyledTableCell>
                                                        <StyledTableCell style={{ width: '10%' }}>Actions</StyledTableCell>
                                                    </TableRow>
                                                </TableHead>
                                                <TableBody>
                                                    {getSortedData(agents).map((agent, index) => {
                                                        const images = getImages(agent)
                                                        return (
                                                            <StyledTableRow
                                                                key={index}
                                                                sx={{
                                                                    cursor: 'pointer',
                                                                    '&:hover': { backgroundColor: theme.palette.action.hover }
                                                                }}
                                                                onClick={() => navigate(`/agents/${agent.id}`)}
                                                            >
                                                                <StyledTableCell>
                                                                    <Tooltip title={agent.name || ''}>
                                                                        <Typography
                                                                            sx={{
                                                                                display: '-webkit-box',
                                                                                fontSize: 14,
                                                                                fontWeight: 500,
                                                                                WebkitLineClamp: 2,
                                                                                WebkitBoxOrient: 'vertical',
                                                                                textOverflow: 'ellipsis',
                                                                                overflow: 'hidden',
                                                                                color: '#2196f3'
                                                                            }}
                                                                        >
                                                                            {agent.name || 'Untitled'}
                                                                        </Typography>
                                                                    </Tooltip>
                                                                </StyledTableCell>
                                                                <StyledTableCell>
                                                                    {images.length > 0 && (
                                                                        <Tooltip title={getModelName(agent) || ''}>
                                                                            <Box
                                                                                sx={{
                                                                                    width: 30,
                                                                                    height: 30,
                                                                                    borderRadius: '50%',
                                                                                    backgroundColor: customization.isDarkMode
                                                                                        ? theme.palette.common.white
                                                                                        : theme.palette.grey[300] + 75
                                                                                }}
                                                                            >
                                                                                <img
                                                                                    style={{
                                                                                        width: '100%',
                                                                                        height: '100%',
                                                                                        padding: 5,
                                                                                        objectFit: 'contain'
                                                                                    }}
                                                                                    alt=''
                                                                                    src={images[0].imageSrc}
                                                                                />
                                                                            </Box>
                                                                        </Tooltip>
                                                                    )}
                                                                </StyledTableCell>
                                                                <StyledTableCell>
                                                                    <Typography
                                                                        sx={{
                                                                            display: '-webkit-box',
                                                                            fontSize: 14,
                                                                            WebkitLineClamp: 2,
                                                                            WebkitBoxOrient: 'vertical',
                                                                            textOverflow: 'ellipsis',
                                                                            overflow: 'hidden',
                                                                            color: theme.palette.text.secondary
                                                                        }}
                                                                    >
                                                                        {getInstruction(agent) || ''}
                                                                    </Typography>
                                                                </StyledTableCell>
                                                                <StyledTableCell>
                                                                    <Typography sx={{ fontSize: 14 }}>
                                                                        {moment(agent.updatedDate).format('MMMM D, YYYY')}
                                                                    </Typography>
                                                                </StyledTableCell>
                                                                <StyledTableCell onClick={(e) => e.stopPropagation()}>
                                                                    <AgentListMenu
                                                                        agent={agent}
                                                                        setError={setError}
                                                                        onRefresh={refreshAgents}
                                                                    />
                                                                </StyledTableCell>
                                                            </StyledTableRow>
                                                        )
                                                    })}
                                                </TableBody>
                                            </Table>
                                        </TableContainer>
                                    )}
                                    <TablePagination currentPage={currentPage} limit={pageLimit} total={total} onChange={onPageChange} />
                                </>
                            )}
                        </Stack>
                    </Fade>
                )}
            </MainCard>
            <ConfirmDialog />
        </>
    )
}

export default Agents
