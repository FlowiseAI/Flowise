import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSelector } from 'react-redux'
import moment from 'moment'
import Avatar from 'boring-avatars'

// material-ui
import {
    Box,
    Fade,
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
import { baseURL } from '@/store/constant'
import { useError } from '@/store/context/ErrorContext'

// icons
import { IconLayoutGrid, IconList, IconSearch } from '@tabler/icons-react'

// ==============================|| CHATFLOWS ||============================== //

const Chatflows = () => {
    const navigate = useNavigate()
    const theme = useTheme()
    const customization = useSelector((state) => state.customization)

    const [isLoading, setLoading] = useState(true)
    const [images, setImages] = useState({})
    const [search, setSearch] = useState('')
    const { error, setError } = useError()

    const getAllChatflowsApi = useApi(chatflowsApi.getAllChatflows)
    const [view, setView] = useState(localStorage.getItem('chatFlowDisplayStyle') || 'card')

    /* Table Pagination */
    const [currentPage, setCurrentPage] = useState(1)
    const [pageLimit, setPageLimit] = useState(() => Number(localStorage.getItem('chatFlowPageSize') || DEFAULT_ITEMS_PER_PAGE))
    const [total, setTotal] = useState(0)

    const onChange = (page, pageLimit) => {
        setCurrentPage(page)
        setPageLimit(pageLimit)
        localStorage.setItem('chatFlowPageSize', pageLimit)
        applyFilters(page, pageLimit)
    }

    const applyFilters = (page, limit) => {
        const params = {
            page: page || currentPage,
            limit: limit || pageLimit
        }
        getAllChatflowsApi.request(params)
    }

    const handleChange = (event, nextView) => {
        if (nextView === null) return
        localStorage.setItem('chatFlowDisplayStyle', nextView)
        setView(nextView)
    }

    const onSearchChange = (event) => {
        setSearch(event.target.value)
    }

    function filterFlows(data) {
        return (
            data?.name.toLowerCase().indexOf(search.toLowerCase()) > -1 ||
            (data.category && data.category.toLowerCase().indexOf(search.toLowerCase()) > -1) ||
            data?.id.toLowerCase().indexOf(search.toLowerCase()) > -1
        )
    }

    const addNew = () => {
        navigate('/canvas')
    }

    const goToCanvas = (selectedChatflow) => {
        navigate(`/canvas/${selectedChatflow.id}`)
    }

    useEffect(() => {
        applyFilters(currentPage, pageLimit)
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    useEffect(() => {
        setLoading(getAllChatflowsApi.loading)
    }, [getAllChatflowsApi.loading])

    useEffect(() => {
        if (getAllChatflowsApi.data) {
            try {
                const chatflows = getAllChatflowsApi.data?.data
                const total = getAllChatflowsApi.data?.total
                setTotal(total)
                const images = {}
                for (let i = 0; i < chatflows.length; i += 1) {
                    const flowDataStr = chatflows[i].flowData
                    const flowData = JSON.parse(flowDataStr)
                    const nodes = flowData.nodes || []
                    images[chatflows[i].id] = []
                    for (let j = 0; j < nodes.length; j += 1) {
                        if (nodes[j].data.name === 'stickyNote' || nodes[j].data.name === 'stickyNoteAgentflow') continue
                        const imageSrc = `${baseURL}/api/v1/node-icon/${nodes[j].data.name}`
                        if (!images[chatflows[i].id].some((img) => img.imageSrc === imageSrc)) {
                            images[chatflows[i].id].push({
                                imageSrc,
                                label: nodes[j].data.label
                            })
                        }
                    }
                }
                setImages(images)
            } catch (e) {
                console.error(e)
            }
        }
    }, [getAllChatflowsApi.data])

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
                                    ...(!isLoading && (getAllChatflowsApi.data?.data?.length ?? 0) === 0
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
                                    Create a chatflow
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
                                    Build flows with prebuilt agents and chains
                                </Typography>

                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                                    <StyledPermissionButton
                                        permissionId={'chatflows:create'}
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
                                        onClick={() => navigate('/marketplaces', { state: { typeFilter: ['Chatflow'] } })}
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
                            </Box>

                            {/* ==================== Chatflows Listing Section ==================== */}
                            {(getAllChatflowsApi.data?.data?.length ?? 0) > 0 && (
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <Typography variant='h3' sx={{ fontWeight: 600, color: theme.palette.text.primary }}>
                                        Chatflows
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

                            {!isLoading && (getAllChatflowsApi.data?.data?.length ?? 0) > 0 && (
                                <>
                                    {!view || view === 'card' ? (
                                        <Box display='grid' gridTemplateColumns='repeat(3, minmax(0, 1fr))' gap={gridSpacing}>
                                            {getAllChatflowsApi.data?.data?.filter(filterFlows).map((data, index) => {
                                                const flowImages = images[data.id] || []
                                                const visible = flowImages.slice(0, 4)
                                                const remaining = flowImages.length - visible.length
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
                                                                name={data.id || data.name || 'chatflow'}
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
                                                        {flowImages.length > 0 && (
                                                            <Box
                                                                sx={{
                                                                    display: 'flex',
                                                                    alignItems: 'center',
                                                                    gap: 0.5,
                                                                    flexShrink: 0
                                                                }}
                                                            >
                                                                {visible.map((img, i) => (
                                                                    <Tooltip key={i} title={img.label || ''} placement='top'>
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
                                                                                src={img.imageSrc}
                                                                            />
                                                                        </Box>
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
                                            data={getAllChatflowsApi.data?.data}
                                            images={images}
                                            isLoading={isLoading}
                                            filterFunction={filterFlows}
                                            updateFlowsApi={getAllChatflowsApi}
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

export default Chatflows
