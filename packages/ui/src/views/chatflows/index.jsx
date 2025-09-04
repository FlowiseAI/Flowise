import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'

// material-ui
import { Box, Skeleton, Stack, ToggleButton, ToggleButtonGroup } from '@mui/material'
import { useTheme } from '@mui/material/styles'

// project imports
import MainCard from '@/ui-component/cards/MainCard'
import ItemCard from '@/ui-component/cards/ItemCard'
import { gridSpacing } from '@/store/constant'
import WorkflowEmptySVG from '@/assets/images/workflow_empty.svg'
import ConfirmDialog from '@/ui-component/dialog/ConfirmDialog'
import { FlowListTable } from '@/ui-component/table/FlowListTable'
import { StyledPermissionButton } from '@/ui-component/button/RBACButtons'
import ViewHeader from '@/layout/MainLayout/ViewHeader'
import ErrorBoundary from '@/ErrorBoundary'
import TablePagination, { DEFAULT_ITEMS_PER_PAGE } from '@/ui-component/pagination/TablePagination'

// API
import chatflowsApi from '@/api/chatflows'

// Hooks
import useApi from '@/hooks/useApi'
import { useTranslation } from 'react-i18next'

// const
import { baseURL } from '@/store/constant'
import { useError } from '@/store/context/ErrorContext'

// icons
import { IconPlus, IconLayoutGrid, IconList } from '@tabler/icons-react'

// ==============================|| CHATFLOWS ||============================== //

const Chatflows = () => {
    const navigate = useNavigate()
    const theme = useTheme()
    const { t } = useTranslation()

    const [isLoading, setLoading] = useState(true)
    const [images, setImages] = useState({})
    const [search, setSearch] = useState('')
    const { error, setError } = useError()

    const getAllChatflowsApi = useApi(chatflowsApi.getAllChatflows)
    const [view, setView] = useState(localStorage.getItem('flowDisplayStyle') || 'card')

    /* Table Pagination */
    const [currentPage, setCurrentPage] = useState(1)
    const [pageLimit, setPageLimit] = useState(DEFAULT_ITEMS_PER_PAGE)
    const [total, setTotal] = useState(0)

    const onChange = (page, pageLimit) => {
        setCurrentPage(page)
        setPageLimit(pageLimit)
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
        localStorage.setItem('flowDisplayStyle', nextView)
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
        <MainCard 
            sx={{
                background: 'linear-gradient(135deg, rgba(74, 144, 226, 0.1) 0%, rgba(80, 200, 120, 0.1) 100%)',
                backdropFilter: 'blur(10px)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '20px',
                boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)'
            }}
        >
            {error ? (
                <ErrorBoundary error={error} />
            ) : (
                <Stack flexDirection='column' sx={{ gap: 3 }}>
                    <ViewHeader
                        onSearchChange={onSearchChange}
                        search={true}
                        searchPlaceholder={t('chatflows.searchPlaceholder')}
                        title={t('chatflows.title')}
                        description={t('chatflows.description')}
                        sx={{
                            background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.1) 0%, rgba(255, 255, 255, 0.05) 100%)',
                            backdropFilter: 'blur(15px)',
                            borderRadius: '16px',
                            border: '1px solid rgba(255, 255, 255, 0.1)',
                            padding: '20px',
                            marginBottom: '20px'
                        }}
                    >
                        <ToggleButtonGroup
                            sx={{ 
                                borderRadius: '12px', 
                                maxHeight: 40,
                                background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.1) 0%, rgba(255, 255, 255, 0.05) 100%)',
                                backdropFilter: 'blur(10px)',
                                border: '1px solid rgba(255, 255, 255, 0.2)',
                                boxShadow: '0 4px 16px rgba(0, 0, 0, 0.1)',
                                mr: 1.5
                            }}
                            value={view}
                            color='primary'
                            disabled={total === 0}
                            exclusive
                            onChange={handleChange}
                        >
                            <ToggleButton
                                sx={{
                                    borderColor: 'rgba(255, 255, 255, 0.2)',
                                    borderRadius: '10px',
                                    color: theme?.customization?.isDarkMode ? 'white' : 'inherit',
                                    background: 'rgba(255, 255, 255, 0.1)',
                                    backdropFilter: 'blur(5px)',
                                    transition: 'all 0.3s ease',
                                    '&:hover': {
                                        background: 'rgba(255, 255, 255, 0.2)',
                                        transform: 'translateY(-2px)',
                                        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)'
                                    },
                                    '&.Mui-selected': {
                                        background: 'linear-gradient(135deg, rgba(74, 144, 226, 0.3) 0%, rgba(80, 200, 120, 0.3) 100%)',
                                        color: 'white'
                                    }
                                }}
                                variant='contained'
                                value='card'
                                title={t('chatflows.cardView')}
                            >
                                <IconLayoutGrid />
                            </ToggleButton>
                            <ToggleButton
                                sx={{
                                    borderColor: 'rgba(255, 255, 255, 0.2)',
                                    borderRadius: '10px',
                                    color: theme?.customization?.isDarkMode ? 'white' : 'inherit',
                                    background: 'rgba(255, 255, 255, 0.1)',
                                    backdropFilter: 'blur(5px)',
                                    transition: 'all 0.3s ease',
                                    '&:hover': {
                                        background: 'rgba(255, 255, 255, 0.2)',
                                        transform: 'translateY(-2px)',
                                        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)'
                                    },
                                    '&.Mui-selected': {
                                        background: 'linear-gradient(135deg, rgba(74, 144, 226, 0.3) 0%, rgba(80, 200, 120, 0.3) 100%)',
                                        color: 'white'
                                    }
                                }}
                                variant='contained'
                                value='list'
                                title={t('chatflows.listView')}
                            >
                                <IconList />
                            </ToggleButton>
                        </ToggleButtonGroup>
                        <StyledPermissionButton
                            permissionId={'chatflows:create'}
                            variant='contained'
                            onClick={addNew}
                            startIcon={<IconPlus />}
                            sx={{ 
                                borderRadius: '12px', 
                                height: 40,
                                ml: 0.5,
                                background: 'linear-gradient(135deg, rgba(74, 144, 226, 0.8) 0%, rgba(80, 200, 120, 0.8) 100%)',
                                backdropFilter: 'blur(10px)',
                                border: '1px solid rgba(255, 255, 255, 0.2)',
                                boxShadow: '0 4px 16px rgba(0, 0, 0, 0.2)',
                                color: 'white',
                                fontWeight: 600,
                                transition: 'all 0.3s ease',
                                '&:hover': {
                                    transform: 'translateY(-2px)',
                                    boxShadow: '0 6px 20px rgba(0, 0, 0, 0.25)'
                                }
                            }}
                        >
                            {t('chatflows.addNew')}
                        </StyledPermissionButton>
                    </ViewHeader>

                    {isLoading && (
                        <Box display='grid' gridTemplateColumns='repeat(3, 1fr)' gap={gridSpacing}>
                            <Skeleton variant='rounded' height={160} />
                            <Skeleton variant='rounded' height={160} />
                            <Skeleton variant='rounded' height={160} />
                        </Box>
                    )}
                    {!isLoading && total > 0 && (
                        <>
                            {!view || view === 'card' ? (
                                <Box 
                                    display='grid' 
                                    gridTemplateColumns='repeat(auto-fit, minmax(320px, 1fr))' 
                                    gap={gridSpacing}
                                    sx={{
                                        padding: '10px',
                                        '& > *': {
                                            background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.1) 0%, rgba(255, 255, 255, 0.05) 100%)',
                                            backdropFilter: 'blur(10px)',
                                            borderRadius: '16px',
                                            border: '1px solid rgba(255, 255, 255, 0.1)',
                                            boxShadow: '0 4px 16px rgba(0, 0, 0, 0.1)',
                                            transition: 'all 0.3s ease',
                                            '&:hover': {
                                                transform: 'translateY(-4px)',
                                                boxShadow: '0 8px 24px rgba(0, 0, 0, 0.15)'
                                            }
                                        }
                                    }}
                                >
                                    {getAllChatflowsApi.data?.data?.filter(filterFlows).map((data, index) => (
                                        <ItemCard key={index} onClick={() => goToCanvas(data)} data={data} images={images[data.id]} />
                                    ))}
                                </Box>
                            ) : (
                                <FlowListTable
                                    data={getAllChatflowsApi.data?.data}
                                    images={images}
                                    isLoading={isLoading}
                                    filterFunction={filterFlows}
                                    updateFlowsApi={getAllChatflowsApi}
                                    setError={setError}
                                />
                            )}
                            {/* Pagination and Page Size Controls */}
                            <TablePagination currentPage={currentPage} limit={pageLimit} total={total} onChange={onChange} />
                        </>
                    )}
                    {!isLoading && (!getAllChatflowsApi.data?.data || getAllChatflowsApi.data?.data.length === 0) && (
                        <Stack 
                            sx={{ 
                                alignItems: 'center', 
                                justifyContent: 'center',
                                background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.1) 0%, rgba(255, 255, 255, 0.05) 100%)',
                                backdropFilter: 'blur(10px)',
                                borderRadius: '20px',
                                border: '1px solid rgba(255, 255, 255, 0.1)',
                                padding: '40px',
                                margin: '20px 0',
                                boxShadow: '0 4px 16px rgba(0, 0, 0, 0.1)'
                            }} 
                            flexDirection='column'
                        >
                            <Box sx={{ p: 2, height: 'auto' }}>
                                <img
                                    style={{ 
                                        objectFit: 'cover', 
                                        height: '25vh', 
                                        width: 'auto',
                                        filter: 'drop-shadow(0 4px 8px rgba(0, 0, 0, 0.1))'
                                    }}
                                    src={WorkflowEmptySVG}
                                    alt='WorkflowEmptySVG'
                                />
                            </Box>
                            <div style={{
                                fontSize: '18px',
                                fontWeight: 500,
                                color: theme?.customization?.isDarkMode ? 'rgba(255, 255, 255, 0.8)' : 'rgba(0, 0, 0, 0.7)',
                                textAlign: 'center'
                            }}>{t('chatflows.empty')}</div>
                        </Stack>
                    )}
                </Stack>
            )}
            <ConfirmDialog />
        </MainCard>
    )
}

export default Chatflows
