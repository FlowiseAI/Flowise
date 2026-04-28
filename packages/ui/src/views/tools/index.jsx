import { useEffect, useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSelector } from 'react-redux'
import moment from 'moment'
import Avatar from 'boring-avatars'

// material-ui
import {
    Box,
    ButtonGroup,
    Fade,
    InputAdornment,
    OutlinedInput,
    Skeleton,
    Stack,
    Tab,
    Tabs,
    ToggleButton,
    ToggleButtonGroup,
    Typography
} from '@mui/material'
import { useTheme, darken } from '@mui/material/styles'

// project imports
import MainCard from '@/ui-component/cards/MainCard'
import MCPItemCard from '@/ui-component/cards/MCPItemCard'
import ToolDialog from './ToolDialog'
import CustomMcpServerDialog from './CustomMcpServerDialog'
import ErrorBoundary from '@/ErrorBoundary'
import { ToolsTable } from '@/ui-component/table/ToolsListTable'
import { MCPServersTable } from '@/ui-component/table/MCPServersTable'
import { PermissionButton, StyledPermissionButton } from '@/ui-component/button/RBACButtons'
import TablePagination, { DEFAULT_ITEMS_PER_PAGE } from '@/ui-component/pagination/TablePagination'

// API
import toolsApi from '@/api/tools'
import customMcpServersApi from '@/api/custommcpservers'

// Hooks
import useApi from '@/hooks/useApi'
import { useError } from '@/store/context/ErrorContext'
import { gridSpacing } from '@/store/constant'

// icons
import { IconFileUpload, IconLayoutGrid, IconList, IconSearch } from '@tabler/icons-react'

// ==============================|| TOOLS ||============================== //

const Tools = () => {
    const theme = useTheme()
    const navigate = useNavigate()
    const customization = useSelector((state) => state.customization)
    const getAllToolsApi = useApi(toolsApi.getAllTools)
    const getAllCustomMcpServersApi = useApi(customMcpServersApi.getAllCustomMcpServers)
    const { error, setError } = useError()

    const [tabValue, setTabValue] = useState(0)

    const [isLoading, setLoading] = useState(true)
    const [showDialog, setShowDialog] = useState(false)
    const [dialogProps, setDialogProps] = useState({})
    const [view, setView] = useState(localStorage.getItem('toolsDisplayStyle') || 'card')

    const inputRef = useRef(null)

    // MCP Servers state
    const [mcpLoading, setMcpLoading] = useState(true)
    const [showMcpDialog, setShowMcpDialog] = useState(false)
    const [mcpDialogProps, setMcpDialogProps] = useState({})
    const [mcpTotal, setMcpTotal] = useState(0)
    const [mcpCurrentPage, setMcpCurrentPage] = useState(1)
    const [mcpPageLimit, setMcpPageLimit] = useState(DEFAULT_ITEMS_PER_PAGE)

    /* Table Pagination */
    const [currentPage, setCurrentPage] = useState(1)
    const [pageLimit, setPageLimit] = useState(DEFAULT_ITEMS_PER_PAGE)
    const [total, setTotal] = useState(0)

    const onChange = (page, pageLimit) => {
        setCurrentPage(page)
        setPageLimit(pageLimit)
        refresh(page, pageLimit)
    }

    const refresh = (page, limit) => {
        const params = {
            page: page || currentPage,
            limit: limit || pageLimit
        }
        getAllToolsApi.request(params)
    }

    const onCustomMcpPageChange = (page, limit) => {
        setMcpCurrentPage(page)
        setMcpPageLimit(limit)
        refreshCustomMcp(page, limit)
    }

    const refreshCustomMcp = (page, limit) => {
        const params = {
            page: page || mcpCurrentPage,
            limit: limit || mcpPageLimit
        }
        getAllCustomMcpServersApi.request(params)
    }

    const handleChange = (event, nextView) => {
        if (nextView === null) return
        localStorage.setItem('toolsDisplayStyle', nextView)
        setView(nextView)
    }

    const onUploadFile = (file) => {
        try {
            const dialogProp = {
                title: 'Add New Tool',
                type: 'IMPORT',
                cancelButtonName: 'Cancel',
                confirmButtonName: 'Save',
                data: JSON.parse(file)
            }
            setDialogProps(dialogProp)
            setShowDialog(true)
        } catch (e) {
            console.error(e)
        }
    }

    const handleFileUpload = (e) => {
        if (!e.target.files) return

        const file = e.target.files[0]

        const reader = new FileReader()
        reader.onload = (evt) => {
            if (!evt?.target?.result) {
                return
            }
            const { result } = evt.target
            onUploadFile(result)
        }
        reader.readAsText(file)
    }

    const addNew = () => {
        const dialogProp = {
            title: 'Add New Tool',
            type: 'ADD',
            cancelButtonName: 'Cancel',
            confirmButtonName: 'Add'
        }
        setDialogProps(dialogProp)
        setShowDialog(true)
    }

    const edit = (selectedTool) => {
        const dialogProp = {
            title: 'Edit Tool',
            type: 'EDIT',
            cancelButtonName: 'Cancel',
            confirmButtonName: 'Save',
            data: selectedTool
        }
        setDialogProps(dialogProp)
        setShowDialog(true)
    }

    const onConfirm = () => {
        setShowDialog(false)
        refresh(currentPage, pageLimit)
    }

    const onAuthorize = () => {
        refreshCustomMcp(mcpCurrentPage, mcpPageLimit)
    }

    // MCP Server handlers
    const addNewCustomMcpServer = () => {
        setMcpDialogProps({ type: 'ADD' })
        setShowMcpDialog(true)
    }

    const editCustomMcpServer = async (server) => {
        try {
            const resp = await customMcpServersApi.getCustomMcpServer(server.id)
            setMcpDialogProps({ type: 'EDIT', data: resp.data ?? server })
        } catch {
            setMcpDialogProps({ type: 'EDIT', data: server })
        }
        setShowMcpDialog(true)
    }

    const onCustomMcpConfirm = () => {
        setShowMcpDialog(false)
        refreshCustomMcp(mcpCurrentPage, mcpPageLimit)
    }

    const onCustomMcpCreated = async (newServerId) => {
        refreshCustomMcp(mcpCurrentPage, mcpPageLimit)
        try {
            const resp = await customMcpServersApi.getCustomMcpServer(newServerId)
            setMcpDialogProps({ type: 'EDIT', data: resp.data ?? { id: newServerId } })
        } catch {
            setMcpDialogProps({ type: 'EDIT', data: { id: newServerId } })
        }
    }

    const [search, setSearch] = useState('')
    const onSearchChange = (event) => {
        setSearch(event.target.value)
    }

    function filterTools(data) {
        return (
            data.name.toLowerCase().indexOf(search.toLowerCase()) > -1 || data.description.toLowerCase().indexOf(search.toLowerCase()) > -1
        )
    }

    function filterCustomMcpServers(data) {
        const s = search.toLowerCase()
        return data.name.toLowerCase().indexOf(s) > -1 || (data.serverUrl && data.serverUrl.toLowerCase().indexOf(s) > -1)
    }

    useEffect(() => {
        if (tabValue === 0) {
            refresh(currentPage, pageLimit)
        } else {
            refreshCustomMcp(mcpCurrentPage, mcpPageLimit)
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [tabValue])

    useEffect(() => {
        setLoading(getAllToolsApi.loading)
    }, [getAllToolsApi.loading])

    useEffect(() => {
        if (getAllToolsApi.data) {
            setTotal(getAllToolsApi.data.total)
        }
    }, [getAllToolsApi.data])

    useEffect(() => {
        setMcpLoading(getAllCustomMcpServersApi.loading)
    }, [getAllCustomMcpServersApi.loading])

    useEffect(() => {
        if (getAllCustomMcpServersApi.data) {
            setMcpTotal(getAllCustomMcpServersApi.data.total)
        }
    }, [getAllCustomMcpServersApi.data])

    return (
        <>
            <MainCard>
                {error ? (
                    <ErrorBoundary error={error} />
                ) : (
                    <Fade in={true} timeout={250} style={{ transitionDelay: '50ms' }}>
                        <Stack flexDirection='column' sx={{ gap: 3 }}>
                            {/* ==================== Tabs ==================== */}
                            <Box
                                sx={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    gap: 2
                                }}
                            >
                                <Tabs value={tabValue} onChange={(e, newValue) => setTabValue(newValue)} aria-label='tools tabs'>
                                    <Tab label='Custom Tools' />
                                    <Tab label='Custom MCP Servers' />
                                </Tabs>
                            </Box>

                            {/* ==================== Custom Tools Tab ==================== */}
                            {tabValue === 0 && (
                                <>
                                    {/* Hero Section */}
                                    <Box
                                        sx={{
                                            display: 'flex',
                                            flexDirection: 'column',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            pt: 4,
                                            pb: 2,
                                            ...(!isLoading && (getAllToolsApi.data?.data?.length ?? 0) === 0
                                                ? { minHeight: 'calc(100vh - 260px)' }
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
                                            Create a tool
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
                                            External functions or APIs the agent can use to take action
                                        </Typography>

                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                                            <StyledPermissionButton
                                                permissionId={'tools:create'}
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
                                            <PermissionButton
                                                permissionId={'tools:create'}
                                                variant='outlined'
                                                onClick={() => inputRef.current.click()}
                                                startIcon={<IconFileUpload size={18} />}
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
                                                Load
                                            </PermissionButton>
                                            <input
                                                style={{ display: 'none' }}
                                                ref={inputRef}
                                                type='file'
                                                hidden
                                                accept='.json'
                                                onChange={(e) => handleFileUpload(e)}
                                            />
                                            {!isLoading && (getAllToolsApi.data?.data?.length ?? 0) === 0 && (
                                                <StyledPermissionButton
                                                    permissionId={'templates:marketplace,templates:custom'}
                                                    variant='outlined'
                                                    onClick={() => navigate('/marketplaces', { state: { typeFilter: ['Tool'] } })}
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
                                            )}
                                        </Box>
                                    </Box>

                                    {/* Tools Listing Section */}
                                    {(getAllToolsApi.data?.data?.length ?? 0) > 0 && (
                                        <Box
                                            sx={{
                                                display: 'flex',
                                                justifyContent: 'space-between',
                                                alignItems: 'center'
                                            }}
                                        >
                                            <Typography variant='h3' sx={{ fontWeight: 600, color: theme.palette.text.primary }}>
                                                Tools
                                            </Typography>
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                <OutlinedInput
                                                    size='small'
                                                    placeholder='Search Tools'
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
                                                <ButtonGroup disableElevation aria-label='outlined primary button group'>
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
                                                </ButtonGroup>
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

                                    {!isLoading && (getAllToolsApi.data?.data?.length ?? 0) > 0 && (
                                        <>
                                            {!view || view === 'card' ? (
                                                <Box display='grid' gridTemplateColumns='repeat(3, minmax(0, 1fr))' gap={gridSpacing}>
                                                    {getAllToolsApi.data?.data?.filter(filterTools).map((data, index) => (
                                                        <Box
                                                            key={index}
                                                            onClick={() => edit(data)}
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
                                                                    backgroundColor:
                                                                        theme.palette.card?.hover || theme.palette.action.hover,
                                                                    boxShadow: '0 4px 20px rgba(0,0,0,0.12)'
                                                                }
                                                            }}
                                                        >
                                                            {data.iconSrc ? (
                                                                <Box
                                                                    sx={{
                                                                        width: 36,
                                                                        height: 36,
                                                                        borderRadius: '50%',
                                                                        flexShrink: 0,
                                                                        backgroundImage: `url(${data.iconSrc})`,
                                                                        backgroundSize: 'contain',
                                                                        backgroundRepeat: 'no-repeat',
                                                                        backgroundPosition: 'center center'
                                                                    }}
                                                                />
                                                            ) : data.color ? (
                                                                <Box
                                                                    sx={{
                                                                        width: 36,
                                                                        height: 36,
                                                                        borderRadius: '50%',
                                                                        flexShrink: 0,
                                                                        background: data.color
                                                                    }}
                                                                />
                                                            ) : (
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
                                                                        name={data.id || data.name || 'tool'}
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
                                                            )}
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
                                                                        color: theme.palette.text.secondary,
                                                                        overflow: 'hidden',
                                                                        textOverflow: 'ellipsis',
                                                                        whiteSpace: 'nowrap'
                                                                    }}
                                                                >
                                                                    {data.description || moment(data.updatedDate).format('MMM D, hh:mm A')}
                                                                </Typography>
                                                            </Box>
                                                        </Box>
                                                    ))}
                                                </Box>
                                            ) : (
                                                <ToolsTable
                                                    data={getAllToolsApi.data?.data?.filter(filterTools) || []}
                                                    isLoading={isLoading}
                                                    onSelect={edit}
                                                />
                                            )}
                                            <TablePagination
                                                currentPage={currentPage}
                                                limit={pageLimit}
                                                total={total}
                                                onChange={onChange}
                                            />
                                        </>
                                    )}
                                </>
                            )}

                            {/* ==================== Custom MCP Servers Tab ==================== */}
                            {tabValue === 1 && (
                                <>
                                    {/* Hero Section */}
                                    <Box
                                        sx={{
                                            display: 'flex',
                                            flexDirection: 'column',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            pt: 4,
                                            pb: 2,
                                            ...(!mcpLoading && (getAllCustomMcpServersApi.data?.data?.length ?? 0) === 0
                                                ? { minHeight: 'calc(100vh - 260px)' }
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
                                            Add MCP Server
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
                                            Connect MCP servers to expand the tools available to your agents
                                        </Typography>

                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                                            <StyledPermissionButton
                                                permissionId={'tools:create'}
                                                variant='contained'
                                                onClick={addNewCustomMcpServer}
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
                                                Add MCP
                                            </StyledPermissionButton>
                                        </Box>
                                    </Box>

                                    {/* MCP Servers Listing Section */}
                                    {(getAllCustomMcpServersApi.data?.data?.length ?? 0) > 0 && (
                                        <Box
                                            sx={{
                                                display: 'flex',
                                                justifyContent: 'space-between',
                                                alignItems: 'center'
                                            }}
                                        >
                                            <Typography variant='h3' sx={{ fontWeight: 600, color: theme.palette.text.primary }}>
                                                MCP Servers
                                            </Typography>
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                <OutlinedInput
                                                    size='small'
                                                    placeholder='Search Custom MCP Servers'
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
                                                <ButtonGroup disableElevation aria-label='outlined primary button group'>
                                                    <ToggleButtonGroup
                                                        sx={{ borderRadius: 2, maxHeight: 36 }}
                                                        value={view}
                                                        color='primary'
                                                        disabled={mcpTotal === 0}
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
                                                </ButtonGroup>
                                            </Box>
                                        </Box>
                                    )}

                                    {mcpLoading && (
                                        <Box display='grid' gridTemplateColumns='repeat(3, minmax(0, 1fr))' gap={gridSpacing}>
                                            <Skeleton variant='rounded' height={80} sx={{ borderRadius: 3 }} />
                                            <Skeleton variant='rounded' height={80} sx={{ borderRadius: 3 }} />
                                            <Skeleton variant='rounded' height={80} sx={{ borderRadius: 3 }} />
                                        </Box>
                                    )}

                                    {!mcpLoading && mcpTotal > 0 && (
                                        <>
                                            {!view || view === 'card' ? (
                                                <Box display='grid' gridTemplateColumns='repeat(3, minmax(0, 1fr))' gap={gridSpacing}>
                                                    {getAllCustomMcpServersApi.data?.data?.filter(filterCustomMcpServers).map((server) => (
                                                        <MCPItemCard
                                                            key={server.id}
                                                            data={server}
                                                            onClick={() => editCustomMcpServer(server)}
                                                        />
                                                    ))}
                                                </Box>
                                            ) : (
                                                <MCPServersTable
                                                    data={getAllCustomMcpServersApi.data?.data?.filter(filterCustomMcpServers) || []}
                                                    isLoading={mcpLoading}
                                                    onSelect={editCustomMcpServer}
                                                />
                                            )}
                                            <TablePagination
                                                currentPage={mcpCurrentPage}
                                                limit={mcpPageLimit}
                                                total={mcpTotal}
                                                onChange={onCustomMcpPageChange}
                                            />
                                        </>
                                    )}
                                </>
                            )}
                        </Stack>
                    </Fade>
                )}
            </MainCard>
            <ToolDialog
                show={showDialog}
                dialogProps={dialogProps}
                onCancel={() => setShowDialog(false)}
                onConfirm={onConfirm}
                setError={setError}
            />
            <CustomMcpServerDialog
                show={showMcpDialog}
                dialogProps={mcpDialogProps}
                onCancel={() => {
                    setShowMcpDialog(false)
                }}
                onConfirm={onCustomMcpConfirm}
                onAuthorize={onAuthorize}
                onCreated={onCustomMcpCreated}
            />
        </>
    )
}

export default Tools
