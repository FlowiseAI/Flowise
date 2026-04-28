import { useEffect, useState } from 'react'
import { useSelector } from 'react-redux'
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
    Skeleton,
    Stack,
    ToggleButton,
    ToggleButtonGroup,
    Tooltip,
    Typography
} from '@mui/material'
import { useTheme, darken } from '@mui/material/styles'

// project imports
import ErrorBoundary from '@/ErrorBoundary'
import { gridSpacing } from '@/store/constant'
import { StyledPermissionButton } from '@/ui-component/button/RBACButtons'
import MainCard from '@/ui-component/cards/MainCard'
import ConfirmDialog from '@/ui-component/dialog/ConfirmDialog'
import TablePagination, { DEFAULT_ITEMS_PER_PAGE } from '@/ui-component/pagination/TablePagination'
import { FlowListTable } from '@/ui-component/table/FlowListTable'

// API
import chatflowsApi from '@/api/chatflows'

// Hooks
import useApi from '@/hooks/useApi'

// const
import { AGENTFLOW_ICONS, baseURL } from '@/store/constant'
import { useError } from '@/store/context/ErrorContext'

// icons
import { IconAlertTriangle, IconLayoutGrid, IconList, IconSearch, IconX } from '@tabler/icons-react'

// ==============================|| AGENTFLOWS ||============================== //

const Agentflows = () => {
    const navigate = useNavigate()
    const theme = useTheme()
    const customization = useSelector((state) => state.customization)

    const [isLoading, setLoading] = useState(true)
    const [images, setImages] = useState({})
    const [icons, setIcons] = useState({})
    const [search, setSearch] = useState('')
    const { error, setError } = useError()

    const getAllAgentflows = useApi(chatflowsApi.getAllAgentflows)
    const [view, setView] = useState(localStorage.getItem('agentFlowDisplayStyle') || 'card')
    const [agentflowVersion, setAgentflowVersion] = useState(localStorage.getItem('agentFlowVersion') || 'v2')
    const [showDeprecationNotice, setShowDeprecationNotice] = useState(true)

    /* Table Pagination */
    const [currentPage, setCurrentPage] = useState(1)
    const [pageLimit, setPageLimit] = useState(() => Number(localStorage.getItem('agentFlowPageSize') || DEFAULT_ITEMS_PER_PAGE))
    const [total, setTotal] = useState(0)

    const onChange = (page, pageLimit) => {
        setCurrentPage(page)
        setPageLimit(pageLimit)
        localStorage.setItem('agentFlowPageSize', pageLimit)
        refresh(page, pageLimit, agentflowVersion)
    }

    const refresh = (page, limit, nextView) => {
        const params = {
            page: page || currentPage,
            limit: limit || pageLimit
        }
        getAllAgentflows.request(nextView === 'v2' ? 'AGENTFLOW' : 'MULTIAGENT', params)
    }

    const handleChange = (event, nextView) => {
        if (nextView === null) return
        localStorage.setItem('agentFlowDisplayStyle', nextView)
        setView(nextView)
    }

    const handleVersionChange = (event, nextView) => {
        if (nextView === null) return
        localStorage.setItem('agentFlowVersion', nextView)
        setAgentflowVersion(nextView)
        refresh(1, pageLimit, nextView)
    }

    const onSearchChange = (event) => {
        setSearch(event.target.value)
    }

    function filterFlows(data) {
        return (
            data.name.toLowerCase().indexOf(search.toLowerCase()) > -1 ||
            (data.category && data.category.toLowerCase().indexOf(search.toLowerCase()) > -1) ||
            data.id.toLowerCase().indexOf(search.toLowerCase()) > -1
        )
    }

    const addNew = () => {
        if (agentflowVersion === 'v2') {
            navigate('/v2/agentcanvas')
        } else {
            navigate('/agentcanvas')
        }
    }

    const goToCanvas = (selectedAgentflow) => {
        if (selectedAgentflow.type === 'AGENTFLOW') {
            navigate(`/v2/agentcanvas/${selectedAgentflow.id}`)
        } else {
            navigate(`/agentcanvas/${selectedAgentflow.id}`)
        }
    }

    const handleDismissDeprecationNotice = () => {
        setShowDeprecationNotice(false)
    }

    useEffect(() => {
        refresh(currentPage, pageLimit, agentflowVersion)

        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    useEffect(() => {
        if (getAllAgentflows.error) {
            setError(getAllAgentflows.error)
        }

        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [getAllAgentflows.error])

    useEffect(() => {
        setLoading(getAllAgentflows.loading)
    }, [getAllAgentflows.loading])

    useEffect(() => {
        if (getAllAgentflows.data) {
            try {
                const agentflows = getAllAgentflows.data?.data
                setTotal(getAllAgentflows.data?.total)
                const images = {}
                const icons = {}
                for (let i = 0; i < agentflows.length; i += 1) {
                    const flowDataStr = agentflows[i].flowData
                    const flowData = JSON.parse(flowDataStr)
                    const nodes = flowData.nodes || []
                    images[agentflows[i].id] = []
                    icons[agentflows[i].id] = []
                    for (let j = 0; j < nodes.length; j += 1) {
                        if (nodes[j].data.name === 'stickyNote' || nodes[j].data.name === 'stickyNoteAgentflow') continue
                        const foundIcon = AGENTFLOW_ICONS.find((icon) => icon.name === nodes[j].data.name)
                        if (foundIcon) {
                            icons[agentflows[i].id].push(foundIcon)
                        } else {
                            const imageSrc = `${baseURL}/api/v1/node-icon/${nodes[j].data.name}`
                            if (!images[agentflows[i].id].some((img) => img.imageSrc === imageSrc)) {
                                images[agentflows[i].id].push({
                                    imageSrc,
                                    label: nodes[j].data.label
                                })
                            }
                        }
                    }
                }
                setImages(images)
                setIcons(icons)
            } catch (e) {
                console.error(e)
            }
        }
    }, [getAllAgentflows.data])

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
                                    ...(!isLoading && (getAllAgentflows.data?.data?.length ?? 0) === 0
                                        ? { minHeight: 'calc(100vh - 200px)' }
                                        : {})
                                }}
                            >
                                <Typography
                                    variant='h2'
                                    sx={{
                                        fontSize: '1.8rem',
                                        fontWeight: 700,
                                        mb: 1,
                                        color: theme.palette.text.primary
                                    }}
                                >
                                    Create an agentflow
                                </Typography>

                                <Typography
                                    sx={{
                                        mb: 3,
                                        fontSize: '1rem',
                                        textAlign: 'center',
                                        fontWeight: 500,
                                        maxWidth: 600
                                    }}
                                >
                                    Multi-agent systems and agentic workflow orchestration
                                </Typography>

                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                                    <StyledPermissionButton
                                        permissionId={'agentflows:create'}
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
                                        Create
                                    </StyledPermissionButton>
                                    <StyledPermissionButton
                                        permissionId={'templates:marketplace,templates:custom'}
                                        variant='outlined'
                                        onClick={() => navigate('/marketplaces', { state: { typeFilter: ['AgentflowV2'] } })}
                                        sx={{
                                            borderRadius: '24px',
                                            px: 3,
                                            height: 44,
                                            textTransform: 'none',
                                            fontSize: '0.95rem',
                                            fontWeight: 600,
                                            border: `1px solid ${theme.palette.grey[900] + 40}`,
                                            backgroundColor: 'transparent',
                                            color: theme.palette.text.primary,
                                            '&:hover': {
                                                backgroundColor: theme.palette.action.hover,
                                                borderColor: theme.palette.grey[900] + 60
                                            }
                                        }}
                                    >
                                        View Templates
                                    </StyledPermissionButton>
                                </Box>
                                {!isLoading && (getAllAgentflows.data?.data?.length ?? 0) === 0 && agentflowVersion === 'v1' && (
                                    <ToggleButtonGroup
                                        sx={{ borderRadius: 2, mt: 3, maxHeight: 36 }}
                                        value={agentflowVersion}
                                        color='primary'
                                        exclusive
                                        onChange={handleVersionChange}
                                    >
                                        <ToggleButton
                                            sx={{
                                                borderColor: theme.palette.grey[900] + 25,
                                                borderRadius: 2,
                                                color: customization.isDarkMode ? 'white' : 'inherit'
                                            }}
                                            variant='contained'
                                            value='v2'
                                            title='V2'
                                        >
                                            <Chip sx={{ mr: 1 }} label='NEW' size='small' color='primary' />
                                            V2
                                        </ToggleButton>
                                        <ToggleButton
                                            sx={{
                                                borderColor: theme.palette.grey[900] + 25,
                                                borderRadius: 2,
                                                color: customization.isDarkMode ? 'white' : 'inherit'
                                            }}
                                            variant='contained'
                                            value='v1'
                                            title='V1'
                                        >
                                            V1
                                        </ToggleButton>
                                    </ToggleButtonGroup>
                                )}
                            </Box>

                            {/* ==================== Agentflows Listing Section ==================== */}
                            {(getAllAgentflows.data?.data?.length ?? 0) > 0 && (
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <Typography variant='h3' sx={{ fontWeight: 600, color: theme.palette.text.primary }}>
                                        Agentflows
                                    </Typography>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                        <OutlinedInput
                                            size='small'
                                            placeholder='Search Name or Category'
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
                                            value={agentflowVersion}
                                            color='primary'
                                            exclusive
                                            onChange={handleVersionChange}
                                        >
                                            <ToggleButton
                                                sx={{
                                                    borderColor: theme.palette.grey[900] + 25,
                                                    borderRadius: 2,
                                                    color: customization.isDarkMode ? 'white' : 'inherit'
                                                }}
                                                variant='contained'
                                                value='v2'
                                                title='V2'
                                            >
                                                <Chip sx={{ mr: 1 }} label='NEW' size='small' color='primary' />
                                                V2
                                            </ToggleButton>
                                            <ToggleButton
                                                sx={{
                                                    borderColor: theme.palette.grey[900] + 25,
                                                    borderRadius: 2,
                                                    color: customization.isDarkMode ? 'white' : 'inherit'
                                                }}
                                                variant='contained'
                                                value='v1'
                                                title='V1'
                                            >
                                                V1
                                            </ToggleButton>
                                        </ToggleButtonGroup>
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

                            {/* Deprecation Notice For V1 */}
                            {agentflowVersion === 'v1' && showDeprecationNotice && (
                                <Box
                                    sx={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        padding: 2,
                                        background: customization.isDarkMode
                                            ? 'linear-gradient(135deg,rgba(165, 128, 6, 0.31) 0%, #ffcc802f 100%)'
                                            : 'linear-gradient(135deg, #fff8e17a 0%, #ffcc804a 100%)',
                                        color: customization.isDarkMode ? 'white' : '#333333',
                                        fontWeight: 400,
                                        borderRadius: 2,
                                        gap: 1.5
                                    }}
                                >
                                    <IconAlertTriangle
                                        size={20}
                                        style={{
                                            color: customization.isDarkMode ? '#ffcc80' : '#f57c00',
                                            flexShrink: 0
                                        }}
                                    />
                                    <Box sx={{ flex: 1 }}>
                                        <strong>V1 Agentflows are deprecated.</strong> We recommend migrating to V2 for improved performance
                                        and continued support.
                                    </Box>
                                    <IconButton
                                        aria-label='dismiss'
                                        size='small'
                                        onClick={handleDismissDeprecationNotice}
                                        sx={{
                                            color: customization.isDarkMode ? '#ffcc80' : '#f57c00',
                                            '&:hover': {
                                                backgroundColor: 'rgba(255, 204, 128, 0.1)'
                                            }
                                        }}
                                    >
                                        <IconX size={16} />
                                    </IconButton>
                                </Box>
                            )}

                            {isLoading && (
                                <Box display='grid' gridTemplateColumns='repeat(3, minmax(0, 1fr))' gap={gridSpacing}>
                                    <Skeleton variant='rounded' height={80} sx={{ borderRadius: 3 }} />
                                    <Skeleton variant='rounded' height={80} sx={{ borderRadius: 3 }} />
                                    <Skeleton variant='rounded' height={80} sx={{ borderRadius: 3 }} />
                                </Box>
                            )}

                            {!isLoading && (getAllAgentflows.data?.data?.length ?? 0) > 0 && (
                                <>
                                    {!view || view === 'card' ? (
                                        <Box display='grid' gridTemplateColumns='repeat(3, minmax(0, 1fr))' gap={gridSpacing}>
                                            {getAllAgentflows.data?.data.filter(filterFlows).map((data, index) => {
                                                const flowImages = images[data.id] || []
                                                const flowIcons = icons[data.id] || []
                                                const combined = [
                                                    ...flowIcons.map((ic) => ({
                                                        type: 'icon',
                                                        icon: ic.icon,
                                                        color: ic.color,
                                                        label: ic.name
                                                    })),
                                                    ...flowImages.map((img) => ({ type: 'image', src: img.imageSrc, label: img.label }))
                                                ]
                                                const visible = combined.slice(0, 4)
                                                const remaining = combined.length - visible.length
                                                return (
                                                    <Box
                                                        key={index}
                                                        onClick={() => goToCanvas(data)}
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
                                                                name={data.id || data.name || 'agentflow'}
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
                                                        <Box sx={{ overflow: 'hidden', flex: 1, minWidth: 0 }}>
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
                                                                {data.name || 'Untitled'}
                                                            </Typography>
                                                            <Typography
                                                                sx={{
                                                                    fontSize: '0.8rem',
                                                                    color: theme.palette.text.secondary
                                                                }}
                                                            >
                                                                {moment(data.updatedDate).format('MMM D, hh:mm A')}
                                                            </Typography>
                                                        </Box>
                                                        {combined.length > 0 && (
                                                            <Box
                                                                sx={{
                                                                    display: 'flex',
                                                                    alignItems: 'center',
                                                                    gap: 0.5,
                                                                    flexShrink: 0
                                                                }}
                                                            >
                                                                {visible.map((item, i) => (
                                                                    <Tooltip key={i} title={item.label || ''} placement='top'>
                                                                        {item.type === 'image' ? (
                                                                            <Box
                                                                                sx={{
                                                                                    width: 24,
                                                                                    height: 24,
                                                                                    borderRadius: '50%',
                                                                                    backgroundColor: customization.isDarkMode
                                                                                        ? theme.palette.common.white
                                                                                        : theme.palette.grey[300] + 75,
                                                                                    display: 'flex',
                                                                                    alignItems: 'center',
                                                                                    justifyContent: 'center'
                                                                                }}
                                                                            >
                                                                                <img
                                                                                    style={{
                                                                                        width: '100%',
                                                                                        height: '100%',
                                                                                        padding: 3,
                                                                                        objectFit: 'contain'
                                                                                    }}
                                                                                    alt=''
                                                                                    src={item.src}
                                                                                />
                                                                            </Box>
                                                                        ) : (
                                                                            <Box
                                                                                sx={{
                                                                                    width: 24,
                                                                                    height: 24,
                                                                                    display: 'flex',
                                                                                    alignItems: 'center',
                                                                                    justifyContent: 'center'
                                                                                }}
                                                                            >
                                                                                <item.icon size={20} color={item.color} />
                                                                            </Box>
                                                                        )}
                                                                    </Tooltip>
                                                                ))}
                                                                {remaining > 0 && (
                                                                    <Typography
                                                                        sx={{
                                                                            fontSize: '0.75rem',
                                                                            color: theme.palette.text.secondary,
                                                                            ml: 0.5
                                                                        }}
                                                                    >
                                                                        +{remaining}
                                                                    </Typography>
                                                                )}
                                                            </Box>
                                                        )}
                                                    </Box>
                                                )
                                            })}
                                        </Box>
                                    ) : (
                                        <FlowListTable
                                            isAgentCanvas={true}
                                            isAgentflowV2={agentflowVersion === 'v2'}
                                            data={getAllAgentflows.data?.data}
                                            images={images}
                                            icons={icons}
                                            isLoading={isLoading}
                                            filterFunction={filterFlows}
                                            updateFlowsApi={getAllAgentflows}
                                            setError={setError}
                                            currentPage={currentPage}
                                            pageLimit={pageLimit}
                                        />
                                    )}
                                    <TablePagination currentPage={currentPage} limit={pageLimit} total={total} onChange={onChange} />
                                </>
                            )}
                        </Stack>
                    </Fade>
                )}
                <ConfirmDialog />
            </MainCard>
        </>
    )
}

export default Agentflows
