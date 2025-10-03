import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'

// material-ui
import { Box, Stack, Skeleton, ToggleButton, ToggleButtonGroup, useTheme, Typography } from '@mui/material'

// project imports
import ViewHeader from '@/layout/MainLayout/ViewHeader'
import MainCard from '@/ui-component/cards/MainCard'
import ItemCard from '@/ui-component/cards/ItemCard'
import { baseURL, gridSpacing } from '@/store/constant'
import AssistantEmptySVG from '@/assets/images/assistant_empty.svg'
import AddCustomAssistantDialog from './AddCustomAssistantDialog'
import ErrorBoundary from '@/ErrorBoundary'
import { StyledPermissionButton } from '@/ui-component/button/RBACButtons'
import CustomAssistantTable from './CustomAssistantTable'

// API
import assistantsApi from '@/api/assistants'

// Hooks
import useApi from '@/hooks/useApi'

// icons
import { IconPlus, IconLayoutGrid, IconList } from '@tabler/icons-react'

// ==============================|| CustomAssistantLayout ||============================== //

const CustomAssistantLayout = () => {
    const navigate = useNavigate()
    const theme = useTheme()

    const getAllAssistantsApi = useApi(assistantsApi.getAllAssistants)

    const [isLoading, setLoading] = useState(true)
    const [error, setError] = useState(null)
    const [showDialog, setShowDialog] = useState(false)
    const [dialogProps, setDialogProps] = useState({})

    const [search, setSearch] = useState('')
    const [view, setView] = useState(localStorage.getItem('assistantDisplayStyle') || 'card')

    const onSearchChange = (event) => setSearch(event.target.value)

    const addNew = () => {
        setDialogProps({
            title: 'Add New Custom Assistant',
            type: 'ADD',
            cancelButtonName: 'Cancel',
            confirmButtonName: 'Add'
        })
        setShowDialog(true)
    }

    const onConfirm = (assistantId) => {
        setShowDialog(false)
        navigate(`/assistants/custom/${assistantId}`)
    }

    const handleChange = (event, nextView) => {
        if (nextView !== null) {
            localStorage.setItem('assistantDisplayStyle', nextView)
            setView(nextView)
        }
    }

    const filterAssistants = (data) => {
        try {
            const parsedData = JSON.parse(data.details)
            return (
                parsedData?.name?.toLowerCase().includes(search.toLowerCase()) ||
                parsedData?.category?.toLowerCase().includes(search.toLowerCase())
            )
        } catch {
            return false
        }
    }

    const getImages = (details) => {
        const images = []
        if (details && details.chatModel && details.chatModel.name) {
            images.push({
                imageSrc: `${baseURL}/api/v1/node-icon/${details.chatModel.name}`
            })
        }
        return images
    }

    // refresh function for rename/delete
    const refreshAssistants = async () => {
        try {
            await getAllAssistantsApi.request('CUSTOM')
        } catch (err) {
            setError(err)
        }
    }

    useEffect(() => {
        refreshAssistants()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    useEffect(() => setLoading(getAllAssistantsApi.loading), [getAllAssistantsApi.loading])
    useEffect(() => {
        if (getAllAssistantsApi.error) setError(getAllAssistantsApi.error)
    }, [getAllAssistantsApi.error])

    const groupedAssistants = (getAllAssistantsApi.data || []).filter(filterAssistants).reduce((acc, item) => {
        let parsed = {}
        try {
            parsed = JSON.parse(item.details)
        } catch {}
        const category = parsed?.category || 'Uncategorized'
        if (!acc[category]) acc[category] = []
        acc[category].push({ ...item, parsedDetails: parsed })
        return acc
    }, {})

    return (
        <>
            <MainCard>
                {error ? (
                    <ErrorBoundary error={error} />
                ) : (
                    <Stack flexDirection='column' sx={{ gap: 3 }}>
                        <ViewHeader
                            isBackButton
                            onSearchChange={onSearchChange}
                            search
                            searchPlaceholder='Search Assistants'
                            title='Custom Assistant'
                            description='Create custom assistants with your choice of LLMs'
                            onBack={() => navigate(-1)}
                        >
                            <ToggleButtonGroup
                                sx={{ borderRadius: 2, maxHeight: 40, color: theme?.customization?.isDarkMode ? 'white' : 'inherit' }}
                                value={view}
                                disabled={!getAllAssistantsApi.data || getAllAssistantsApi.data.length === 0}
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

                            <StyledPermissionButton
                                permissionId={'assistants:create'}
                                variant='contained'
                                sx={{ borderRadius: 2, height: 40 }}
                                onClick={addNew}
                                startIcon={<IconPlus />}
                            >
                                Add
                            </StyledPermissionButton>
                        </ViewHeader>

                        {isLoading ? (
                            <Box display='grid' gridTemplateColumns='repeat(3, 1fr)' gap={gridSpacing}>
                                <Skeleton variant='rounded' height={160} />
                                <Skeleton variant='rounded' height={160} />
                                <Skeleton variant='rounded' height={160} />
                            </Box>
                        ) : view === 'card' ? (
                            Object.entries(groupedAssistants || {}).map(([category, items]) => (
                                <Box key={category}>
                                    <Box
                                        sx={{
                                            mb: 2,
                                            px: 2,
                                            py: 1,
                                            display: 'inline-block',
                                            borderRadius: 2,
                                            backgroundColor: theme.palette.primary.light,
                                            color: theme.palette.primary.contrastText,
                                            fontWeight: 600,
                                            boxShadow: 1
                                        }}
                                    >
                                        <Typography variant='subtitle1'>{category}</Typography>
                                    </Box>

                                    <Box display='grid' gridTemplateColumns='repeat(3, 1fr)' gap={gridSpacing}>
                                        {items.map((data) => (
                                            <ItemCard
                                                key={data.id}
                                                onClick={() => navigate(`/assistants/custom/${data.id}`)}
                                                data={{
                                                    name: data.parsedDetails.name,
                                                    description: data.parsedDetails.description || data.parsedDetails.instruction
                                                }}
                                                images={getImages(data.parsedDetails)}
                                            />
                                        ))}
                                    </Box>
                                </Box>
                            ))
                        ) : (
                            <CustomAssistantTable
                                data={getAllAssistantsApi.data || []}
                                images={{}}
                                icons={{}}
                                isLoading={isLoading}
                                filterFunction={filterAssistants}
                                updateAssistantsApi={{ request: refreshAssistants }} // ✅ pass refresh function
                                setError={setError}
                            />
                        )}

                        {!isLoading && (!getAllAssistantsApi.data?.length || getAllAssistantsApi.data.length === 0) && (
                            <Stack sx={{ alignItems: 'center', justifyContent: 'center' }} flexDirection='column'>
                                <Box sx={{ p: 2, height: 'auto' }}>
                                    <img
                                        style={{ objectFit: 'cover', height: '20vh', width: 'auto' }}
                                        src={AssistantEmptySVG}
                                        alt='AssistantEmptySVG'
                                    />
                                </Box>
                                <div>No Custom Assistants Added Yet</div>
                            </Stack>
                        )}
                    </Stack>
                )}
            </MainCard>

            <AddCustomAssistantDialog
                show={showDialog}
                dialogProps={dialogProps}
                onCancel={() => setShowDialog(false)}
                onConfirm={onConfirm}
                updateAssistantsApi={{ request: refreshAssistants }}
                setError={setError}
            />
        </>
    )
}

export default CustomAssistantLayout
