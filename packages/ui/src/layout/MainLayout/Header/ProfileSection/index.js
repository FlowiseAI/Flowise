import { useState, useRef, useEffect } from 'react'
import PropTypes from 'prop-types'
import { useSelector, useDispatch } from 'react-redux'
import { useNavigate } from 'react-router-dom'

// material-ui
import { useTheme } from '@mui/material/styles'
import {
    Box,
    ButtonBase,
    ClickAwayListener,
    Divider,
    List,
    ListItemButton,
    ListItemIcon,
    ListItemText,
    Paper,
    Popper,
    Typography,
    Switch
} from '@mui/material'
import { styled } from '@mui/material/styles'

// third-party
import PerfectScrollbar from 'react-perfect-scrollbar'

// project imports
import MainCard from 'ui-component/cards/MainCard'
import Transitions from 'ui-component/extended/Transitions'
import { BackdropLoader } from 'ui-component/loading/BackdropLoader'
import AboutDialog from 'ui-component/dialog/AboutDialog'

// assets
import { IconInfoCircle } from '@tabler/icons'
import { ReactComponent as IconUpload } from 'assets/images/upload.svg'
import { ReactComponent as IconDownload } from 'assets/images/download.svg'
import { ReactComponent as IconExit } from 'assets/images/exit.svg'

import iconDown from 'assets/images/IconDown.svg'
import iconSettings from 'assets/images/IconSettings.svg'

// API
import databaseApi from 'api/database'

import { SET_MENU, SET_DARKMODE } from 'store/actions'

import './index.css'
const AntSwitch = styled(Switch)(({ theme }) => ({
    width: 28,
    height: 16,
    padding: 0,
    display: 'flex',
    '&:active': {
        '& .MuiSwitch-thumb': {
            width: 15
        },
        '& .MuiSwitch-switchBase.Mui-checked': {
            transform: 'translateX(9px)'
        }
    },
    '& .MuiSwitch-switchBase': {
        padding: 2,
        '&.Mui-checked': {
            transform: 'translateX(12px)',
            color: '#fff',
            '& + .MuiSwitch-track': {
                opacity: 1,
                backgroundColor: theme.palette.mode === 'dark' ? '#177ddc' : '#1890ff'
            }
        }
    },
    '& .MuiSwitch-thumb': {
        boxShadow: '0 2px 4px 0 rgb(0 35 11 / 20%)',
        width: 12,
        height: 12,
        borderRadius: 6,
        transition: theme.transitions.create(['width'], {
            duration: 200
        })
    },
    '& .MuiSwitch-track': {
        borderRadius: 16 / 2,
        opacity: 1,
        backgroundColor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,.35)' : 'rgba(0,0,0,.25)',
        boxSizing: 'border-box'
    }
}))

// ==============================|| PROFILE MENU ||============================== //

const ProfileSection = ({ username, handleLogout }) => {
    const theme = useTheme()
    const dispatch = useDispatch()
    const navigate = useNavigate()
    const customization = useSelector((state) => state.customization)

    const [isDark, setIsDark] = useState(customization.isDarkMode)

    const changeDarkMode = () => {
        dispatch({ type: SET_DARKMODE, isDarkMode: !isDark })
        setIsDark((isDark) => !isDark)
        localStorage.setItem('isDarkMode', !isDark)
    }

    const [open, setOpen] = useState(false)
    const [loading, setLoading] = useState(false)
    const [aboutDialogOpen, setAboutDialogOpen] = useState(false)

    const anchorRef = useRef(null)
    const uploadRef = useRef(null)

    const handleClose = (event) => {
        if (anchorRef.current && anchorRef.current.contains(event.target)) {
            return
        }
        setOpen(false)
    }

    const handleToggle = () => {
        setOpen((prevOpen) => !prevOpen)
    }

    const handleExportDB = async () => {
        setOpen(false)
        try {
            const response = await databaseApi.getExportDatabase()
            const exportItems = response.data
            let dataStr = JSON.stringify(exportItems, null, 2)
            let dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr)

            let exportFileDefaultName = `DB.json`

            let linkElement = document.createElement('a')
            linkElement.setAttribute('href', dataUri)
            linkElement.setAttribute('download', exportFileDefaultName)
            linkElement.click()
        } catch (e) {
            console.error(e)
        }
    }

    const handleFileUpload = (e) => {
        if (!e.target.files) return

        const file = e.target.files[0]
        const reader = new FileReader()
        reader.onload = async (evt) => {
            if (!evt?.target?.result) {
                return
            }
            const { result } = evt.target

            if (result.includes(`"chatmessages":[`) && result.includes(`"chatflows":[`) && result.includes(`"apikeys":[`)) {
                dispatch({ type: SET_MENU, opened: false })
                setLoading(true)

                try {
                    await databaseApi.createLoadDatabase(JSON.parse(result))
                    setLoading(false)
                    navigate('/', { replace: true })
                    navigate(0)
                } catch (e) {
                    console.error(e)
                    setLoading(false)
                }
            } else {
                alert('Incorrect Flowise Database Format')
            }
        }
        reader.readAsText(file)
    }

    const prevOpen = useRef(open)
    useEffect(() => {
        if (prevOpen.current === true && open === false) {
            anchorRef.current.focus()
        }

        prevOpen.current = open
    }, [open])

    return (
        <>
            <ButtonBase ref={anchorRef} sx={{ borderRadius: '12px', overflow: 'hidden' }} onClick={handleToggle}>
                {/* <Avatar
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
                </Avatar> */}
                <img src={iconSettings} alt='settings' />
                <div className='settings__title'>Настройки</div>
                <img src={iconDown} alt='down' />
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
                                                        setOpen(false)
                                                        uploadRef.current.click()
                                                    }}
                                                >
                                                    <ListItemIcon>
                                                        <IconUpload stroke={1.5} size='1.3rem' />
                                                    </ListItemIcon>
                                                    <ListItemText
                                                        primary={<Typography variant='body2'>Загрузить базу данных</Typography>}
                                                    />
                                                </ListItemButton>
                                                <ListItemButton
                                                    sx={{ borderRadius: `${customization.borderRadius}px` }}
                                                    onClick={handleExportDB}
                                                >
                                                    <ListItemIcon>
                                                        <IconDownload stroke={1.5} size='1.3rem' />
                                                    </ListItemIcon>
                                                    <ListItemText primary={<Typography variant='body2'>Экспорт базы данных</Typography>} />
                                                </ListItemButton>
                                                <Divider />
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
                                                    <ListItemText primary={<Typography variant='body2'>О Start.AI</Typography>} />
                                                </ListItemButton>
                                                <Divider />
                                                {/* <ListItemText
                                                    sx={{
                                                        borderRadius: `${customization.borderRadius}px`,
                                                        display: 'flex',
                                                        flexDirection: 'column'
                                                    }}
                                                >
                                                    <ListItemText primary={<Typography variant='body2'>Тема</Typography>} />
                                                    <ListItemButton onClick={changeDarkMode}>
                                                        <ListItemIcon>
                                                            <IconFileExport stroke={1.5} size='1.3rem' />
                                                        </ListItemIcon>
                                                        <ListItemText primary={<Typography variant='body2'>Темная тема</Typography>} />
                                                        <AntSwitch checked={isDark} inputProps={{ 'aria-label': 'ant design' }} />
                                                    </ListItemButton>
                                                </ListItemText>
                                                <Divider /> */}
                                                {localStorage.getItem('username') && localStorage.getItem('password') && (
                                                    <ListItemButton
                                                        sx={{ borderRadius: `${customization.borderRadius}px` }}
                                                        onClick={handleLogout}
                                                    >
                                                        <ListItemIcon>
                                                            <IconExit stroke={1.5} size='1.3rem' />
                                                        </ListItemIcon>
                                                        <ListItemText primary={<Typography variant='body2'>Выйти</Typography>} />
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
            <input ref={uploadRef} type='file' hidden accept='.json' onChange={(e) => handleFileUpload(e)} />
            <BackdropLoader open={loading} />
            <AboutDialog show={aboutDialogOpen} onCancel={() => setAboutDialogOpen(false)} />
        </>
    )
}

ProfileSection.propTypes = {
    username: PropTypes.string,
    handleLogout: PropTypes.func
}

export default ProfileSection
