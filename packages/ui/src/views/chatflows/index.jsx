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
import LoginDialog from '@/ui-component/dialog/LoginDialog'
import ConfirmDialog from '@/ui-component/dialog/ConfirmDialog'
import { FlowListTable } from '@/ui-component/table/FlowListTable'
import { StyledButton } from '@/ui-component/button/StyledButton'
import ViewHeader from '@/layout/MainLayout/ViewHeader'
import ErrorBoundary from '@/ErrorBoundary'

// API
import chatflowsApi from '@/api/chatflows'

// Hooks
import useApi from '@/hooks/useApi'

// const
import { baseURL } from '@/store/constant'

// icons
import { IconPlus, IconLayoutGrid, IconList } from '@tabler/icons-react'

// ==============================|| CHATFLOWS ||============================== //

const Chatflows = () => {
    const navigate = useNavigate()
    const theme = useTheme()

    const [isLoading, setLoading] = useState(true)
    const [error, setError] = useState(null)
    const [images, setImages] = useState({})
    const [search, setSearch] = useState('')
    const [loginDialogOpen, setLoginDialogOpen] = useState(false)
    const [loginDialogProps, setLoginDialogProps] = useState({})

    const getAllChatflowsApi = useApi(chatflowsApi.getAllChatflows)
    const [view, setView] = useState(localStorage.getItem('flowDisplayStyle') || 'card')

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
            data.name.toLowerCase().indexOf(search.toLowerCase()) > -1 ||
            (data.category && data.category.toLowerCase().indexOf(search.toLowerCase()) > -1)
        )
    }

    const onLoginClick = (username, password) => {
        localStorage.setItem('username', username)
        localStorage.setItem('password', password)
        navigate(0)
    }

    const addNew = () => {
        navigate('/canvas')
    }

    const goToCanvas = (selectedChatflow) => {
        navigate(`/canvas/${selectedChatflow.id}`)
    }

    useEffect(() => {
        getAllChatflowsApi.request()

        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    useEffect(() => {
        if (getAllChatflowsApi.error) {
            if (getAllChatflowsApi.error?.response?.status === 401) {
                setLoginDialogProps({
                    title: 'Login',
                    confirmButtonName: 'Login'
                })
                setLoginDialogOpen(true)
            } else {
                setError(getAllChatflowsApi.error)
            }
        }
    }, [getAllChatflowsApi.error])

    useEffect(() => {
        setLoading(getAllChatflowsApi.loading)
    }, [getAllChatflowsApi.loading])

    useEffect(() => {
        if (getAllChatflowsApi.data) {
            try {
                const chatflows = getAllChatflowsApi.data
                const images = {}
                for (let i = 0; i < chatflows.length; i += 1) {
                    const flowDataStr = chatflows[i].flowData
                    const flowData = JSON.parse(flowDataStr)
                    const nodes = flowData.nodes || []
                    images[chatflows[i].id] = []
                    for (let j = 0; j < nodes.length; j += 1) {
                        const imageSrc = `${baseURL}/api/v1/node-icon/${nodes[j].data.name}`
                        if (!images[chatflows[i].id].includes(imageSrc)) {
                            images[chatflows[i].id].push(imageSrc)
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
        <MainCard>
            {error ? (
                <ErrorBoundary error={error} />
            ) : (
                <Stack flexDirection='column' sx={{ gap: 3 }}>
                    <ViewHeader onSearchChange={onSearchChange} search={true} searchPlaceholder='Search Name or Category' title='Chatflows'>
                        <ToggleButtonGroup
                            sx={{ borderRadius: 2, maxHeight: 40 }}
                            value={view}
                            color='primary'
                            exclusive
                            onChange={handleChange}
                        >
                            <ToggleButton
                                sx={{
                                    borderColor: theme.palette.grey[900] + 25,
                                    borderRadius: 2,
                                    color: theme?.customization?.isDarkMode ? 'white' : 'inherit'
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
                                    color: theme?.customization?.isDarkMode ? 'white' : 'inherit'
                                }}
                                variant='contained'
                                value='list'
                                title='List View'
                            >
                                <IconList />
                            </ToggleButton>
                        </ToggleButtonGroup>
                        <StyledButton variant='contained' onClick={addNew} startIcon={<IconPlus />} sx={{ borderRadius: 2, height: 40 }}>
                            Add New
                        </StyledButton>
                    </ViewHeader>
                    {!view || view === 'card' ? (
                        <>
                            {isLoading && !getAllChatflowsApi.data ? (
                                <Box display='grid' gridTemplateColumns='repeat(3, 1fr)' gap={gridSpacing}>
                                    <Skeleton variant='rounded' height={160} />
                                    <Skeleton variant='rounded' height={160} />
                                    <Skeleton variant='rounded' height={160} />
                                </Box>
                            ) : (
                                <Box display='grid' gridTemplateColumns='repeat(3, 1fr)' gap={gridSpacing}>
                                    {getAllChatflowsApi.data?.filter(filterFlows).map((data, index) => (
                                        <ItemCard key={index} onClick={() => goToCanvas(data)} data={data} images={images[data.id]} />
                                    ))}
                                </Box>
                            )}
                        </>
                    ) : (
                        <FlowListTable
                            data={getAllChatflowsApi.data}
                            images={images}
                            isLoading={isLoading}
                            filterFunction={filterFlows}
                            updateFlowsApi={getAllChatflowsApi}
                            setError={setError}
                        />
                    )}
                    {!isLoading && (!getAllChatflowsApi.data || getAllChatflowsApi.data.length === 0) && (
                        <Stack sx={{ alignItems: 'center', justifyContent: 'center' }} flexDirection='column'>
                            <Box sx={{ p: 2, height: 'auto' }}>
                                <img
                                    style={{ objectFit: 'cover', height: '25vh', width: 'auto' }}
                                    src={WorkflowEmptySVG}
                                    alt='WorkflowEmptySVG'
                                />
                            </Box>
                            <div>No Chatflows Yet</div>
                        </Stack>
                    )}
                </Stack>
            )}

            <LoginDialog show={loginDialogOpen} dialogProps={loginDialogProps} onConfirm={onLoginClick} />
            <ConfirmDialog />
        </MainCard>
    )
}

export default Chatflows
