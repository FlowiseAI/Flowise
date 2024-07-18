import { closeSnackbar as closeSnackbarAction, enqueueSnackbar as enqueueSnackbarAction, MENU_OPEN, REMOVE_DIRTY } from '@/store/actions'
import { sanitizeChatflows } from '@/utils/genericHelper'
import useNotifier from '@/utils/useNotifier'
import PropTypes from 'prop-types'
import { useEffect, useRef, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
// material-ui
import {
    Avatar,
    Box,
    Button,
    ButtonBase,
    ClickAwayListener,
    Divider,
    List,
    ListItemButton,
    ListItemIcon,
    ListItemText,
    Paper,
    Popper,
    Typography
} from '@mui/material'
import { useTheme } from '@mui/material/styles'

// third-party
import PerfectScrollbar from 'react-perfect-scrollbar'

// project imports
import MainCard from '@/ui-component/cards/MainCard'
import AboutDialog from '@/ui-component/dialog/AboutDialog'
import Transitions from '@/ui-component/extended/Transitions'

// assets
import { IconFileExport, IconFileUpload, IconInfoCircle, IconLogout, IconSettings, IconX } from '@tabler/icons-react'
import './index.css'

//API
import chatFlowsApi from '@/api/chatflows'

// Hooks
import useApi from '@/hooks/useApi'
import { useLocation, useNavigate } from 'react-router-dom'

// ==============================|| PROFILE MENU ||============================== //

const ProfileSection = ({ username, handleLogout }) => {
    const theme = useTheme()

    const customization = useSelector((state) => state.customization)

    const [open, setOpen] = useState(false)
    const [aboutDialogOpen, setAboutDialogOpen] = useState(false)

    const anchorRef = useRef(null)
    const inputRef = useRef()

    const navigate = useNavigate()
    const location = useLocation()

    // ==============================|| Snackbar ||============================== //

    useNotifier()
    const dispatch = useDispatch()
    const enqueueSnackbar = (...args) => dispatch(enqueueSnackbarAction(...args))
    const closeSnackbar = (...args) => dispatch(closeSnackbarAction(...args))

    const handleClose = (event) => {
        if (anchorRef.current && anchorRef.current.contains(event.target)) {
            return
        }
        setOpen(false)
    }

    const handleToggle = () => {
        setOpen((prevOpen) => !prevOpen)
    }

    const errorFailed = (message) => {
        enqueueSnackbar({
            message: message,
            options: {
                key: new Date().getTime() + Math.random(),
                variant: 'error',
                persist: true,
                action: (key) => (
                    <Button style={{ color: 'white' }} onClick={() => closeSnackbar(key)}>
                        <IconX />
                    </Button>
                )
            }
        })
    }
    const importChatflowsApi = useApi(chatFlowsApi.importChatflows)
    const fileChange = (e) => {
        if (!e.target.files) return

        const file = e.target.files[0]

        const reader = new FileReader()
        reader.onload = (evt) => {
            if (!evt?.target?.result) {
                return
            }
            const chatflows = JSON.parse(evt.target.result)
            importChatflowsApi.request(chatflows)
        }
        reader.readAsText(file)
    }

    const importChatflowsSuccess = () => {
        dispatch({ type: REMOVE_DIRTY })
        enqueueSnackbar({
            message: `Import chatflows successful`,
            options: {
                key: new Date().getTime() + Math.random(),
                variant: 'success',
                action: (key) => (
                    <Button style={{ color: 'white' }} onClick={() => closeSnackbar(key)}>
                        <IconX />
                    </Button>
                )
            }
        })
    }
    useEffect(() => {
        if (importChatflowsApi.error) errorFailed(`Failed to import chatflows: ${importChatflowsApi.error.response.data.message}`)
        if (importChatflowsApi.data) {
            importChatflowsSuccess()
            // if current location is /chatflows, refresh the page
            if (location.pathname === '/chatflows') navigate(0)
            else {
                // if not redirect to /chatflows
                dispatch({ type: MENU_OPEN, id: 'chatflows' })
                navigate('/chatflows')
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [importChatflowsApi.error, importChatflowsApi.data])
    const importAllChatflows = () => {
        inputRef.current.click()
    }
    const getAllChatflowsApi = useApi(chatFlowsApi.getAllChatflows)

    const exportChatflowsSuccess = () => {
        dispatch({ type: REMOVE_DIRTY })
        enqueueSnackbar({
            message: `Export chatflows successful`,
            options: {
                key: new Date().getTime() + Math.random(),
                variant: 'success',
                action: (key) => (
                    <Button style={{ color: 'white' }} onClick={() => closeSnackbar(key)}>
                        <IconX />
                    </Button>
                )
            }
        })
    }

    useEffect(() => {
        if (getAllChatflowsApi.error) errorFailed(`Failed to export Chatflows: ${getAllChatflowsApi.error.response.data.message}`)
        if (getAllChatflowsApi.data) {
            const sanitizedChatflows = sanitizeChatflows(getAllChatflowsApi.data)
            const dataStr = JSON.stringify({ Chatflows: sanitizedChatflows }, null, 2)
            const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr)

            const exportFileDefaultName = 'AllChatflows.json'

            const linkElement = document.createElement('a')
            linkElement.setAttribute('href', dataUri)
            linkElement.setAttribute('download', exportFileDefaultName)
            linkElement.click()
            exportChatflowsSuccess()
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [getAllChatflowsApi.error, getAllChatflowsApi.data])

    const prevOpen = useRef(open)
    useEffect(() => {
        if (prevOpen.current === true && open === false) {
            anchorRef.current.focus()
        }

        prevOpen.current = open
    }, [open])

    return (
        <>
            <ButtonBase ref={anchorRef} sx={{ borderRadius: '12px', overflow: 'hidden' }}>
                <Avatar
                    variant='rounded'
                    sx={{
                        ...theme.typography.commonAvatar,
                        ...theme.typography.mediumAvatar,
                        transition: 'all .2s ease-in-out',
                        background: theme.palette.secondary.light,
                        color: theme.palette.secondary.dark,
                        '&:hover': {
                            background: theme.palette.secondary.dark,
                            color: theme.palette.secondary.light
                        }
                    }}
                    onClick={handleToggle}
                    color='inherit'
                >
                    <IconSettings stroke={1.5} size='1.3rem' />
                </Avatar>
            </ButtonBase>
            <Popper
                placement='bottom-end'
                open={open}
                anchorEl={anchorRef.current}
                role={undefined}
                transition
                disablePortal
                popperOptions={{
                    modifiers: [
                        {
                            name: 'offset',
                            options: {
                                offset: [0, 14]
                            }
                        }
                    ]
                }}
            >
                {({ TransitionProps }) => (
                    <Transitions in={open} {...TransitionProps}>
                        <Paper>
                            <ClickAwayListener onClickAway={handleClose}>
                                <MainCard border={false} elevation={16} content={false} boxShadow shadow={theme.shadows[16]}>
                                    {username && (
                                        <Box sx={{ p: 2 }}>
                                            <Typography component='span' variant='h4'>
                                                {username}
                                            </Typography>
                                        </Box>
                                    )}
                                    <PerfectScrollbar style={{ height: '100%', maxHeight: 'calc(100vh - 250px)', overflowX: 'hidden' }}>
                                        <Box sx={{ p: 2 }}>
                                            <Divider />
                                            <List
                                                component='nav'
                                                sx={{
                                                    width: '100%',
                                                    maxWidth: 250,
                                                    minWidth: 200,
                                                    backgroundColor: theme.palette.background.paper,
                                                    borderRadius: '10px',
                                                    [theme.breakpoints.down('md')]: {
                                                        minWidth: '100%'
                                                    },
                                                    '& .MuiListItemButton-root': {
                                                        mt: 0.5
                                                    }
                                                }}
                                            >
                                                <ListItemButton
                                                    sx={{ borderRadius: `${customization.borderRadius}px` }}
                                                    onClick={() => {
                                                        getAllChatflowsApi.request()
                                                    }}
                                                >
                                                    <ListItemIcon>
                                                        <IconFileExport stroke={1.5} size='1.3rem' />
                                                    </ListItemIcon>
                                                    <ListItemText primary={<Typography variant='body2'>Export Chatflows</Typography>} />
                                                </ListItemButton>
                                                <ListItemButton
                                                    sx={{ borderRadius: `${customization.borderRadius}px` }}
                                                    onClick={() => {
                                                        importAllChatflows()
                                                    }}
                                                >
                                                    <ListItemIcon>
                                                        <IconFileUpload stroke={1.5} size='1.3rem' />
                                                    </ListItemIcon>
                                                    <ListItemText primary={<Typography variant='body2'>Import Chatflows</Typography>} />
                                                </ListItemButton>
                                                <input ref={inputRef} type='file' hidden onChange={fileChange} />
                                                <ListItemButton
                                                    sx={{ borderRadius: `${customization.borderRadius}px` }}
                                                    onClick={() => {
                                                        setOpen(false)
                                                        setAboutDialogOpen(true)
                                                    }}
                                                >
                                                    <ListItemIcon>
                                                        <IconInfoCircle stroke={1.5} size='1.3rem' />
                                                    </ListItemIcon>
                                                    <ListItemText primary={<Typography variant='body2'>About Flowise</Typography>} />
                                                </ListItemButton>
                                                {localStorage.getItem('username') && localStorage.getItem('password') && (
                                                    <ListItemButton
                                                        sx={{ borderRadius: `${customization.borderRadius}px` }}
                                                        onClick={handleLogout}
                                                    >
                                                        <ListItemIcon>
                                                            <IconLogout stroke={1.5} size='1.3rem' />
                                                        </ListItemIcon>
                                                        <ListItemText primary={<Typography variant='body2'>Logout</Typography>} />
                                                    </ListItemButton>
                                                )}
                                            </List>
                                        </Box>
                                    </PerfectScrollbar>
                                </MainCard>
                            </ClickAwayListener>
                        </Paper>
                    </Transitions>
                )}
            </Popper>
            <AboutDialog show={aboutDialogOpen} onCancel={() => setAboutDialogOpen(false)} />
        </>
    )
}

ProfileSection.propTypes = {
    username: PropTypes.string,
    handleLogout: PropTypes.func
}

export default ProfileSection
