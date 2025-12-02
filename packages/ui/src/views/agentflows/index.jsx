import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSelector } from 'react-redux'

// material-ui
import { Chip, Box, Stack, ToggleButton, ToggleButtonGroup, IconButton } from '@mui/material'
import { useTheme } from '@mui/material/styles'

// project imports
import MainCard from '@/ui-component/cards/MainCard'
import ItemCard from '@/ui-component/cards/ItemCard'
import { gridSpacing } from '@/store/constant'
import AgentsEmptySVG from '@/assets/images/agents_empty.svg'
import ConfirmDialog from '@/ui-component/dialog/ConfirmDialog'
import { FlowListTable } from '@/ui-component/table/FlowListTable'
import ViewHeader from '@/layout/MainLayout/ViewHeader'
import ErrorBoundary from '@/ErrorBoundary'
import { StyledPermissionButton } from '@/ui-component/button/RBACButtons'
import TablePagination, { DEFAULT_ITEMS_PER_PAGE } from '@/ui-component/pagination/TablePagination'

// API
import chatflowsApi from '@/api/chatflows'

// Hooks
import useApi from '@/hooks/useApi'

// const
import { baseURL, AGENTFLOW_ICONS } from '@/store/constant'
import { useError } from '@/store/context/ErrorContext'

// icons
import { IconPlus, IconLayoutGrid, IconList, IconX, IconAlertTriangle } from '@tabler/icons-react'

// ==============================|| AGENTS ||============================== //

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
    const [view, setView] = useState(localStorage.getItem('flowDisplayStyle') || 'card')
    const [agentflowVersion, setAgentflowVersion] = useState(localStorage.getItem('agentFlowVersion') || 'v2')
    const [showDeprecationNotice, setShowDeprecationNotice] = useState(true)

    /* Table Pagination */
    const [currentPage, setCurrentPage] = useState(1)
    const [pageLimit, setPageLimit] = useState(DEFAULT_ITEMS_PER_PAGE)
    const [total, setTotal] = useState(0)

    const onChange = (page, pageLimit) => {
        setCurrentPage(page)
        setPageLimit(pageLimit)
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
        localStorage.setItem('flowDisplayStyle', nextView)
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
        <MainCard>
            {error ? (
                <ErrorBoundary error={error} />
            ) : (
                <Stack flexDirection='column' sx={{ gap: 3 }}>
                    <ViewHeader
                        onSearchChange={onSearchChange}
                        search={true}
                        searchPlaceholder='Search Name or Category'
                        title='Agentflows'
                        description='Multi-agent systems, workflow orchestration'
                    >
                        <ToggleButtonGroup
                            sx={{ borderRadius: 2, maxHeight: 40 }}
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
                            sx={{ borderRadius: 2, maxHeight: 40 }}
                            value={view}
                            disabled={total === 0}
                            color='primary'
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
                                <IconLayoutGrid />
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
                                <IconList />
                            </ToggleButton>
                        </ToggleButtonGroup>
                        <StyledPermissionButton
                            permissionId={'agentflows:create'}
                            variant='contained'
                            onClick={addNew}
                            startIcon={<IconPlus />}
                            sx={{ borderRadius: 2, height: 40 }}
                        >
                            Add New
                        </StyledPermissionButton>
                    </ViewHeader>

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
                                <strong>V1 Agentflows are deprecated.</strong> We recommend migrating to V2 for improved performance and
                                continued support.
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
                    {!isLoading && total > 0 && (
                        <>
                            {!view || view === 'card' ? (
                                <Box display='grid' gridTemplateColumns='repeat(3, 1fr)' gap={gridSpacing}>
                                    {getAllAgentflows.data?.data.filter(filterFlows).map((data, index) => (
                                        <ItemCard
                                            key={index}
                                            onClick={() => goToCanvas(data)}
                                            data={data}
                                            images={images[data.id]}
                                            icons={icons[data.id]}
                                        />
                                    ))}
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
                            {/* Pagination and Page Size Controls */}
                            <TablePagination currentPage={currentPage} limit={pageLimit} total={total} onChange={onChange} />
                        </>
                    )}

                    {!isLoading && total === 0 && (
                        <Stack sx={{ alignItems: 'center', justifyContent: 'center' }} flexDirection='column'>
                            <Box sx={{ p: 2, height: 'auto' }}>
                                <img
                                    style={{ objectFit: 'cover', height: '12vh', width: 'auto' }}
                                    src={AgentsEmptySVG}
                                    alt='AgentsEmptySVG'
                                />
                            </Box>
                            <div>No Agents Yet</div>
                        </Stack>
                    )}
                </Stack>
            )}
            <ConfirmDialog />
        </MainCard>
    )
}

export default Agentflows
