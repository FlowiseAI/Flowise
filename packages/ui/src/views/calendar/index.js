import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSelector } from 'react-redux'
import { Box, Button, Grid, Typography, useTheme, useMediaQuery, Dialog, DialogTitle, DialogContent, DialogActions, TextField, FormControl, InputLabel, Select, MenuItem, FormHelperText } from '@mui/material'
import { IconPlus } from '@tabler/icons-react'
import FullCalendar from '@fullcalendar/react'
import dayGridPlugin from '@fullcalendar/daygrid'
import timeGridPlugin from '@fullcalendar/timegrid'
import interactionPlugin from '@fullcalendar/interaction'
import listPlugin from '@fullcalendar/list'
import MainCard from '@/ui-component/cards/MainCard'
import { StyledButton } from '@/ui-component/button/StyledButton'
import { ToastContainer, toast } from 'react-toastify'
import 'react-toastify/dist/ReactToastify.css'
import axios from 'axios'

const Calendar = () => {
    const theme = useTheme()
    const navigate = useNavigate()
    const customization = useSelector((state) => state.customization)
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'))
    const [triggers, setTriggers] = useState([])
    const [chatflows, setChatflows] = useState([])
    const [events, setEvents] = useState([])
    const [openDialog, setOpenDialog] = useState(false)
    const [selectedEvent, setSelectedEvent] = useState(null)
    const [newTrigger, setNewTrigger] = useState({
        name: '',
        type: 'calendar',
        chatflowId: '',
        config: JSON.stringify({
            schedule: 'once',
            date: new Date().toISOString(),
            time: '12:00',
            repeat: 'daily'
        }, null, 2),
        isActive: true
    })
    const [errors, setErrors] = useState({})

    useEffect(() => {
        // Fetch triggers and chatflows
        fetchTriggers()
        fetchChatflows()
    }, [])

    useEffect(() => {
        // Convert triggers to calendar events
        if (triggers.length > 0) {
            const calendarEvents = triggers
                .filter((trigger) => trigger.type === 'calendar')
                .map((trigger) => {
                    const config = JSON.parse(trigger.config || '{}')
                    const chatflow = chatflows.find((cf) => cf.id === trigger.chatflowId)
                    return {
                        id: trigger.id,
                        title: trigger.name,
                        start: config.date,
                        allDay: !config.time,
                        backgroundColor: trigger.isActive ? theme.palette.primary.main : theme.palette.grey[500],
                        borderColor: trigger.isActive ? theme.palette.primary.main : theme.palette.grey[500],
                        textColor: theme.palette.background.default,
                        extendedProps: {
                            chatflowName: chatflow?.name || 'Unknown',
                            description: `Trigger for ${chatflow?.name || 'Unknown'} chatflow`,
                            config
                        }
                    }
                })
            setEvents(calendarEvents)
        }
    }, [triggers, chatflows, theme])

    const fetchTriggers = async () => {
        try {
            const response = await axios.get('/api/v1/triggers')
            setTriggers(response.data)
        } catch (error) {
            console.error('Error fetching triggers:', error)
            toast.error('Failed to fetch triggers')
        }
    }

    const fetchChatflows = async () => {
        try {
            const response = await axios.get('/api/v1/chatflows')
            setChatflows(response.data)
        } catch (error) {
            console.error('Error fetching chatflows:', error)
            toast.error('Failed to fetch chatflows')
        }
    }

    const handleDateClick = (info) => {
        setNewTrigger({
            ...newTrigger,
            config: JSON.stringify({
                schedule: 'once',
                date: info.dateStr,
                time: '12:00',
                repeat: 'daily'
            }, null, 2)
        })
        setOpenDialog(true)
    }

    const handleEventClick = (info) => {
        const triggerId = info.event.id
        const trigger = triggers.find((t) => t.id === triggerId)
        if (trigger) {
            setSelectedEvent(trigger)
            setNewTrigger({
                ...trigger,
                config: typeof trigger.config === 'string' ? trigger.config : JSON.stringify(trigger.config, null, 2)
            })
            setOpenDialog(true)
        }
    }

    const handleCloseDialog = () => {
        setOpenDialog(false)
        setSelectedEvent(null)
        setNewTrigger({
            name: '',
            type: 'calendar',
            chatflowId: '',
            config: JSON.stringify({
                schedule: 'once',
                date: new Date().toISOString(),
                time: '12:00',
                repeat: 'daily'
            }, null, 2),
            isActive: true
        })
        setErrors({})
    }

    const validateForm = () => {
        const newErrors = {}
        if (!newTrigger.name) newErrors.name = 'Name is required'
        if (!newTrigger.chatflowId) newErrors.chatflowId = 'Chatflow is required'
        
        try {
            JSON.parse(newTrigger.config)
        } catch (e) {
            newErrors.config = 'Invalid JSON configuration'
        }
        
        setErrors(newErrors)
        return Object.keys(newErrors).length === 0
    }

    const handleSaveTrigger = async () => {
        if (!validateForm()) return

        try {
            if (selectedEvent) {
                // Update existing trigger
                await axios.put(`/api/v1/triggers/${selectedEvent.id}`, newTrigger)
                toast.success('Trigger updated successfully')
            } else {
                // Create new trigger
                await axios.post('/api/v1/triggers', newTrigger)
                toast.success('Trigger created successfully')
            }
            handleCloseDialog()
            fetchTriggers()
        } catch (error) {
            console.error('Error saving trigger:', error)
            toast.error('Failed to save trigger')
        }
    }

    const handleDeleteTrigger = async () => {
        if (!selectedEvent) return

        try {
            await axios.delete(`/api/v1/triggers/${selectedEvent.id}`)
            toast.success('Trigger deleted successfully')
            handleCloseDialog()
            fetchTriggers()
        } catch (error) {
            console.error('Error deleting trigger:', error)
            toast.error('Failed to delete trigger')
        }
    }

    const handleInputChange = (e) => {
        const { name, value } = e.target
        setNewTrigger({ ...newTrigger, [name]: value })
    }

    return (
        <Box>
            <ToastContainer
                position='top-right'
                autoClose={3000}
                hideProgressBar={false}
                newestOnTop
                closeOnClick
                rtl={false}
                pauseOnFocusLoss
                draggable
                pauseOnHover
                theme={customization.isDarkMode ? 'dark' : 'light'}
            />
            <Grid container spacing={2}>
                <Grid item xs={12}>
                    <MainCard>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                            <Typography variant='h3'>Calendar</Typography>
                            <StyledButton
                                variant='contained'
                                startIcon={<IconPlus />}
                                onClick={() => setOpenDialog(true)}
                                sx={{ borderRadius: 1 }}
                            >
                                New Trigger
                            </StyledButton>
                        </Box>
                        <Box sx={{ height: 'calc(100vh - 250px)' }}>
                            <FullCalendar
                                plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin, listPlugin]}
                                headerToolbar={{
                                    left: 'prev,next today',
                                    center: 'title',
                                    right: 'dayGridMonth,timeGridWeek,timeGridDay,listWeek'
                                }}
                                initialView={isMobile ? 'listWeek' : 'dayGridMonth'}
                                editable={true}
                                selectable={true}
                                selectMirror={true}
                                dayMaxEvents={true}
                                events={events}
                                dateClick={handleDateClick}
                                eventClick={handleEventClick}
                                height='100%'
                            />
                        </Box>
                    </MainCard>
                </Grid>
            </Grid>

            {/* Trigger Dialog */}
            <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth='md' fullWidth>
                <DialogTitle>{selectedEvent ? 'Edit Trigger' : 'New Trigger'}</DialogTitle>
                <DialogContent>
                    <Grid container spacing={2} sx={{ mt: 1 }}>
                        <Grid item xs={12} md={6}>
                            <TextField
                                fullWidth
                                label='Trigger Name'
                                name='name'
                                value={newTrigger.name}
                                onChange={handleInputChange}
                                error={!!errors.name}
                                helperText={errors.name}
                            />
                        </Grid>
                        <Grid item xs={12} md={6}>
                            <FormControl fullWidth error={!!errors.chatflowId}>
                                <InputLabel>Chatflow</InputLabel>
                                <Select
                                    name='chatflowId'
                                    value={newTrigger.chatflowId}
                                    label='Chatflow'
                                    onChange={handleInputChange}
                                >
                                    {chatflows.map((chatflow) => (
                                        <MenuItem key={chatflow.id} value={chatflow.id}>
                                            {chatflow.name}
                                        </MenuItem>
                                    ))}
                                </Select>
                                {errors.chatflowId && <FormHelperText>{errors.chatflowId}</FormHelperText>}
                            </FormControl>
                        </Grid>
                        <Grid item xs={12}>
                            <TextField
                                fullWidth
                                label='Configuration (JSON)'
                                name='config'
                                value={newTrigger.config}
                                onChange={handleInputChange}
                                multiline
                                rows={10}
                                error={!!errors.config}
                                helperText={errors.config || 'JSON configuration for the trigger'}
                            />
                        </Grid>
                        <Grid item xs={12}>
                            <FormControl fullWidth>
                                <InputLabel>Status</InputLabel>
                                <Select
                                    name='isActive'
                                    value={newTrigger.isActive}
                                    label='Status'
                                    onChange={(e) => setNewTrigger({ ...newTrigger, isActive: e.target.value })}
                                >
                                    <MenuItem value={true}>Active</MenuItem>
                                    <MenuItem value={false}>Inactive</MenuItem>
                                </Select>
                            </FormControl>
                        </Grid>
                    </Grid>
                </DialogContent>
                <DialogActions>
                    {selectedEvent && (
                        <Button onClick={handleDeleteTrigger} color='error'>
                            Delete
                        </Button>
                    )}
                    <Button onClick={handleCloseDialog}>Cancel</Button>
                    <Button onClick={handleSaveTrigger} variant='contained'>
                        Save
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    )
}

export default Calendar