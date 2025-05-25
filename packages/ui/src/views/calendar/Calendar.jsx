import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSelector } from 'react-redux'
import { Box, Grid, Paper, Typography, Button, IconButton, Tooltip, useTheme } from '@mui/material'
import FullCalendar from '@fullcalendar/react'
import dayGridPlugin from '@fullcalendar/daygrid'
import timeGridPlugin from '@fullcalendar/timegrid'
import listPlugin from '@fullcalendar/list'
import interactionPlugin from '@fullcalendar/interaction'
import AddIcon from '@mui/icons-material/Add'
import RefreshIcon from '@mui/icons-material/Refresh'
import PlayArrowIcon from '@mui/icons-material/PlayArrow'
import EditIcon from '@mui/icons-material/Edit'
import DeleteIcon from '@mui/icons-material/Delete'
import { StyledButton } from '@/ui-component/button/StyledButton'
import { baseURL } from '@/store/constant'
import { enqueueSnackbar as enqueueSnackbarAction, closeSnackbar as closeSnackbarAction } from '@/store/actions'
import { dispatch } from '@/store'
import MainCard from '@/ui-component/cards/MainCard'
import { gridSpacing } from '@/store/constant'
import axios from 'axios'

const Calendar = () => {
    const theme = useTheme()
    const navigate = useNavigate()
    const customization = useSelector((state) => state.customization)
    const [triggers, setTriggers] = useState([])
    const [events, setEvents] = useState([])
    const [loading, setLoading] = useState(true)
    const [selectedEvent, setSelectedEvent] = useState(null)

    const enqueueSnackbar = (...args) => dispatch(enqueueSnackbarAction(...args))
    const closeSnackbar = (...args) => dispatch(closeSnackbarAction(...args))

    const fetchTriggers = async () => {
        try {
            setLoading(true)
            const response = await axios.get(`${baseURL}/api/v1/triggers`)
            setTriggers(response.data)
            
            // Convert triggers to calendar events
            const calendarEvents = response.data.map((trigger) => {
                const config = typeof trigger.config === 'string' ? JSON.parse(trigger.config) : trigger.config
                
                // Default event properties
                const eventProps = {
                    id: trigger.id,
                    title: trigger.name,
                    allDay: false,
                    backgroundColor: trigger.isActive ? theme.palette.primary.main : theme.palette.grey[500],
                    borderColor: trigger.isActive ? theme.palette.primary.dark : theme.palette.grey[600],
                    textColor: theme.palette.common.white,
                    extendedProps: {
                        triggerId: trigger.id,
                        triggerType: trigger.type,
                        description: trigger.description || '',
                        isActive: trigger.isActive
                    }
                }
                
                // Handle different trigger types
                if (trigger.type === 'schedule' && config) {
                    if (config.dateTime) {
                        // One-time schedule
                        eventProps.start = new Date(config.dateTime)
                        eventProps.end = new Date(new Date(config.dateTime).getTime() + 30 * 60000) // Add 30 minutes
                    } else if (config.cronExpression) {
                        // Recurring schedule - show as all-day event
                        eventProps.allDay = true
                        eventProps.start = new Date()
                        eventProps.title = `${trigger.name} (Recurring)`
                        eventProps.backgroundColor = theme.palette.secondary.main
                        eventProps.borderColor = theme.palette.secondary.dark
                    }
                } else if (trigger.type === 'webhook') {
                    // Webhook triggers - show as all-day event
                    eventProps.allDay = true
                    eventProps.start = new Date()
                    eventProps.title = `${trigger.name} (Webhook)`
                    eventProps.backgroundColor = theme.palette.success.main
                    eventProps.borderColor = theme.palette.success.dark
                } else if (trigger.type === 'composio') {
                    // Composio triggers - show as all-day event
                    eventProps.allDay = true
                    eventProps.start = new Date()
                    eventProps.title = `${trigger.name} (Composio)`
                    eventProps.backgroundColor = theme.palette.warning.main
                    eventProps.borderColor = theme.palette.warning.dark
                }
                
                return eventProps
            })
            
            setEvents(calendarEvents)
            setLoading(false)
        } catch (error) {
            console.error('Error fetching triggers:', error)
            enqueueSnackbar({
                message: 'Failed to fetch triggers',
                options: {
                    key: new Date().getTime() + Math.random(),
                    variant: 'error',
                    action: (key) => (
                        <Button style={{ color: 'white' }} onClick={() => closeSnackbar(key)}>
                            Dismiss
                        </Button>
                    )
                }
            })
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchTriggers()
    }, [])

    const handleEventClick = (clickInfo) => {
        setSelectedEvent(clickInfo.event)
    }

    const handleDateClick = (arg) => {
        // Navigate to create trigger page with date pre-filled
        navigate('/triggers/create', { state: { date: arg.dateStr } })
    }

    const handleCreateTrigger = () => {
        navigate('/triggers/create')
    }

    const handleEditTrigger = (triggerId) => {
        navigate(`/triggers/edit/${triggerId}`)
    }

    const handleDeleteTrigger = async (triggerId) => {
        try {
            await axios.delete(`${baseURL}/api/v1/triggers/${triggerId}`)
            enqueueSnackbar({
                message: 'Trigger deleted successfully',
                options: {
                    key: new Date().getTime() + Math.random(),
                    variant: 'success',
                    action: (key) => (
                        <Button style={{ color: 'white' }} onClick={() => closeSnackbar(key)}>
                            Dismiss
                        </Button>
                    )
                }
            })
            fetchTriggers()
        } catch (error) {
            console.error('Error deleting trigger:', error)
            enqueueSnackbar({
                message: 'Failed to delete trigger',
                options: {
                    key: new Date().getTime() + Math.random(),
                    variant: 'error',
                    action: (key) => (
                        <Button style={{ color: 'white' }} onClick={() => closeSnackbar(key)}>
                            Dismiss
                        </Button>
                    )
                }
            })
        }
    }

    const handleExecuteTrigger = async (triggerId) => {
        try {
            await axios.post(`${baseURL}/api/v1/triggers/${triggerId}/execute`)
            enqueueSnackbar({
                message: 'Trigger executed successfully',
                options: {
                    key: new Date().getTime() + Math.random(),
                    variant: 'success',
                    action: (key) => (
                        <Button style={{ color: 'white' }} onClick={() => closeSnackbar(key)}>
                            Dismiss
                        </Button>
                    )
                }
            })
        } catch (error) {
            console.error('Error executing trigger:', error)
            enqueueSnackbar({
                message: 'Failed to execute trigger',
                options: {
                    key: new Date().getTime() + Math.random(),
                    variant: 'error',
                    action: (key) => (
                        <Button style={{ color: 'white' }} onClick={() => closeSnackbar(key)}>
                            Dismiss
                        </Button>
                    )
                }
            })
        }
    }

    return (
        <MainCard>
            <Grid container spacing={gridSpacing}>
                <Grid item xs={12}>
                    <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                        <Typography variant="h3">Agency Calendar</Typography>
                        <Box>
                            <Tooltip title="Refresh">
                                <IconButton onClick={fetchTriggers} disabled={loading}>
                                    <RefreshIcon />
                                </IconButton>
                            </Tooltip>
                            <StyledButton variant="contained" color="primary" startIcon={<AddIcon />} onClick={handleCreateTrigger}>
                                New Trigger
                            </StyledButton>
                        </Box>
                    </Box>
                </Grid>
                <Grid item xs={12} md={9}>
                    <Paper
                        elevation={0}
                        sx={{
                            border: '1px solid',
                            borderColor: theme.palette.mode === 'dark' ? theme.palette.divider : theme.palette.grey[300],
                            borderRadius: 2,
                            overflow: 'hidden'
                        }}
                    >
                        <FullCalendar
                            plugins={[dayGridPlugin, timeGridPlugin, listPlugin, interactionPlugin]}
                            headerToolbar={{
                                left: 'prev,next today',
                                center: 'title',
                                right: 'dayGridMonth,timeGridWeek,timeGridDay,listWeek'
                            }}
                            initialView="dayGridMonth"
                            editable={false}
                            selectable={true}
                            selectMirror={true}
                            dayMaxEvents={true}
                            events={events}
                            dateClick={handleDateClick}
                            eventClick={handleEventClick}
                            height="auto"
                            aspectRatio={1.5}
                        />
                    </Paper>
                </Grid>
                <Grid item xs={12} md={3}>
                    <Paper
                        elevation={0}
                        sx={{
                            border: '1px solid',
                            borderColor: theme.palette.mode === 'dark' ? theme.palette.divider : theme.palette.grey[300],
                            borderRadius: 2,
                            p: 2,
                            height: '100%'
                        }}
                    >
                        {selectedEvent ? (
                            <Box>
                                <Typography variant="h4" gutterBottom>
                                    {selectedEvent.title}
                                </Typography>
                                <Typography variant="body2" color="textSecondary" gutterBottom>
                                    Type: {selectedEvent.extendedProps.triggerType}
                                </Typography>
                                {selectedEvent.extendedProps.description && (
                                    <Typography variant="body2" paragraph>
                                        {selectedEvent.extendedProps.description}
                                    </Typography>
                                )}
                                <Typography variant="body2" color="textSecondary" gutterBottom>
                                    Status: {selectedEvent.extendedProps.isActive ? 'Active' : 'Inactive'}
                                </Typography>
                                <Box mt={2} display="flex" gap={1}>
                                    <StyledButton
                                        size="small"
                                        variant="contained"
                                        color="primary"
                                        startIcon={<PlayArrowIcon />}
                                        onClick={() => handleExecuteTrigger(selectedEvent.extendedProps.triggerId)}
                                    >
                                        Run Now
                                    </StyledButton>
                                    <StyledButton
                                        size="small"
                                        variant="outlined"
                                        startIcon={<EditIcon />}
                                        onClick={() => handleEditTrigger(selectedEvent.extendedProps.triggerId)}
                                    >
                                        Edit
                                    </StyledButton>
                                    <StyledButton
                                        size="small"
                                        variant="outlined"
                                        color="error"
                                        startIcon={<DeleteIcon />}
                                        onClick={() => handleDeleteTrigger(selectedEvent.extendedProps.triggerId)}
                                    >
                                        Delete
                                    </StyledButton>
                                </Box>
                            </Box>
                        ) : (
                            <Box display="flex" flexDirection="column" alignItems="center" justifyContent="center" height="100%">
                                <Typography variant="body1" color="textSecondary" align="center">
                                    Select an event to view details
                                </Typography>
                            </Box>
                        )}
                    </Paper>
                </Grid>
            </Grid>
        </MainCard>
    )
}

export default Calendar