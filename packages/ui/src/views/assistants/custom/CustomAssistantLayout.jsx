import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import moment from 'moment'

// material-ui
import {
    Box,
    Fade,
    Paper,
    Skeleton,
    Stack,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    ToggleButton,
    ToggleButtonGroup,
    Typography
} from '@mui/material'
import { useTheme, styled } from '@mui/material/styles'
import { tableCellClasses } from '@mui/material/TableCell'

// project imports
import ViewHeader from '@/layout/MainLayout/ViewHeader'
import MainCard from '@/ui-component/cards/MainCard'
import ItemCard from '@/ui-component/cards/ItemCard'
import { baseURL, gridSpacing } from '@/store/constant'
import AssistantEmptySVG from '@/assets/images/assistant_empty.svg'
import AddCustomAssistantDialog from './AddCustomAssistantDialog'
import ErrorBoundary from '@/ErrorBoundary'
import { StyledPermissionButton } from '@/ui-component/button/RBACButtons'
import ConfirmDialog from '@/ui-component/dialog/ConfirmDialog'

// API
import assistantsApi from '@/api/assistants'

// Hooks
import useApi from '@/hooks/useApi'

// icons
import { IconPlus, IconLayoutGrid, IconList } from '@tabler/icons-react'

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

// ==============================|| CustomAssistantLayout ||============================== //

const CustomAssistantLayout = () => {
    const navigate = useNavigate()
    const theme = useTheme()

    const getAllAssistantsApi = useApi(assistantsApi.getAllAssistants)

    const [isLoading, setLoading] = useState(true)
    const [error, setError] = useState(null)
    const [showDialog, setShowDialog] = useState(false)
    const [dialogProps, setDialogProps] = useState({})
    const [view, setView] = useState(localStorage.getItem('agentDisplayStyle') || 'card')

    const [search, setSearch] = useState('')
    const onSearchChange = (event) => {
        setSearch(event.target.value)
    }

    const handleChange = (event, nextView) => {
        if (nextView === null) return
        localStorage.setItem('agentDisplayStyle', nextView)
        setView(nextView)
    }

    const addNew = () => {
        const dialogProp = {
            title: 'Add New Agent',
            type: 'ADD',
            cancelButtonName: 'Cancel',
            confirmButtonName: 'Add'
        }
        setDialogProps(dialogProp)
        setShowDialog(true)
    }

    const onConfirm = (assistantId) => {
        setShowDialog(false)
        navigate(`/agents/${assistantId}`)
    }

    function filterAssistants(data) {
        const parsedData = JSON.parse(data.details)
        return parsedData && parsedData.name && parsedData.name.toLowerCase().indexOf(search.toLowerCase()) > -1
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

    useEffect(() => {
        getAllAssistantsApi.request('CUSTOM')
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    useEffect(() => {
        setLoading(getAllAssistantsApi.loading)
    }, [getAllAssistantsApi.loading])

    useEffect(() => {
        if (getAllAssistantsApi.error) {
            setError(getAllAssistantsApi.error)
        }
    }, [getAllAssistantsApi.error])

    const totalAgents = getAllAssistantsApi.data?.length || 0

    return (
        <>
            <MainCard>
                {error ? (
                    <ErrorBoundary error={error} />
                ) : (
                    <Fade in={!isLoading} timeout={250} style={{ transitionDelay: isLoading ? '0ms' : '50ms' }}>
                        <Stack flexDirection='column' sx={{ gap: 3 }}>
                            <ViewHeader
                                onSearchChange={onSearchChange}
                                search={true}
                                searchPlaceholder='Search Agents'
                                title='Agents'
                                description='Build single-agent system for chat'
                            >
                                <ToggleButtonGroup
                                    sx={{ borderRadius: 2, maxHeight: 40 }}
                                    value={view}
                                    color='primary'
                                    disabled={totalAgents === 0}
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
                                    Add New
                                </StyledPermissionButton>
                            </ViewHeader>

                            {isLoading && (
                                <Box display='grid' gridTemplateColumns='repeat(3, 1fr)' gap={gridSpacing}>
                                    <Skeleton variant='rounded' height={160} />
                                    <Skeleton variant='rounded' height={160} />
                                    <Skeleton variant='rounded' height={160} />
                                </Box>
                            )}

                            {!isLoading && totalAgents > 0 && (
                                <>
                                    {!view || view === 'card' ? (
                                        <Box display='grid' gridTemplateColumns='repeat(3, 1fr)' gap={gridSpacing}>
                                            {getAllAssistantsApi.data?.filter(filterAssistants).map((data, index) => (
                                                <ItemCard
                                                    data={{
                                                        name: JSON.parse(data.details)?.name,
                                                        description: JSON.parse(data.details)?.instruction
                                                    }}
                                                    images={getImages(JSON.parse(data.details))}
                                                    key={index}
                                                    onClick={() => navigate('/agents/' + data.id)}
                                                />
                                            ))}
                                        </Box>
                                    ) : (
                                        <TableContainer
                                            component={Paper}
                                            sx={{ border: 1, borderColor: theme.palette.grey[900] + 25, borderRadius: 2 }}
                                        >
                                            <Table sx={{ minWidth: 650 }}>
                                                <TableHead>
                                                    <TableRow>
                                                        <StyledTableCell>Name</StyledTableCell>
                                                        <StyledTableCell>Model</StyledTableCell>
                                                        <StyledTableCell>Last Updated</StyledTableCell>
                                                        <StyledTableCell sx={{ textAlign: 'right' }}>Actions</StyledTableCell>
                                                    </TableRow>
                                                </TableHead>
                                                <TableBody>
                                                    {getAllAssistantsApi.data?.filter(filterAssistants).map((data, index) => {
                                                        const details = JSON.parse(data.details)
                                                        return (
                                                            <StyledTableRow
                                                                key={index}
                                                                hover
                                                                sx={{ cursor: 'pointer' }}
                                                                onClick={() => navigate('/agents/' + data.id)}
                                                            >
                                                                <StyledTableCell>
                                                                    <Stack direction='row' alignItems='center' spacing={1.5}>
                                                                        {details.chatModel?.name && (
                                                                            <Box
                                                                                component='img'
                                                                                src={`${baseURL}/api/v1/node-icon/${details.chatModel.name}`}
                                                                                sx={{ width: 28, height: 28, borderRadius: '50%' }}
                                                                            />
                                                                        )}
                                                                        <Typography variant='subtitle1'>{details.name}</Typography>
                                                                    </Stack>
                                                                </StyledTableCell>
                                                                <StyledTableCell>
                                                                    <Typography variant='body2' color='text.secondary'>
                                                                        {details.chatModel?.label || details.chatModel?.name || '-'}
                                                                    </Typography>
                                                                </StyledTableCell>
                                                                <StyledTableCell>
                                                                    <Typography variant='body2' color='text.secondary'>
                                                                        {data.updatedDate
                                                                            ? moment(data.updatedDate).format('MMM D, YYYY')
                                                                            : '-'}
                                                                    </Typography>
                                                                </StyledTableCell>
                                                                <StyledTableCell sx={{ textAlign: 'right' }} />
                                                            </StyledTableRow>
                                                        )
                                                    })}
                                                </TableBody>
                                            </Table>
                                        </TableContainer>
                                    )}
                                </>
                            )}

                            {!isLoading && totalAgents === 0 && (
                                <Stack sx={{ alignItems: 'center', justifyContent: 'center' }} flexDirection='column'>
                                    <Box sx={{ p: 2, height: 'auto' }}>
                                        <img
                                            style={{ objectFit: 'cover', height: '20vh', width: 'auto' }}
                                            src={AssistantEmptySVG}
                                            alt='AssistantEmptySVG'
                                        />
                                    </Box>
                                    <div>No Agents Added Yet</div>
                                </Stack>
                            )}
                        </Stack>
                    </Fade>
                )}
            </MainCard>
            <AddCustomAssistantDialog
                show={showDialog}
                dialogProps={dialogProps}
                onCancel={() => setShowDialog(false)}
                onConfirm={onConfirm}
                setError={setError}
            />
            <ConfirmDialog />
        </>
    )
}

export default CustomAssistantLayout
