import PropTypes from 'prop-types'
import { useState, useRef, forwardRef, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import { BackdropLoader } from 'ui-component/loading/BackdropLoader'
import AboutDialog from 'ui-component/dialog/AboutDialog'
// material-ui

import { useTheme } from '@mui/material/styles'
import {
    Avatar,
    Chip,
    ListItemButton,
    ListItemIcon,
    ListItemText,
    useMediaQuery,
    Popper,
    Typography,
    Paper,
    Box,
    ClickAwayListener,
    Divider,
    List
} from '@mui/material'
// third-party
import { IconLogout, IconFileExport, IconFileDownload, IconInfoCircle } from '@tabler/icons'
import PerfectScrollbar from 'react-perfect-scrollbar'

// project imports
// project imports
import { MENU_OPEN, SET_MENU } from 'store/actions'
import config from 'config'
import MainCard from 'ui-component/cards/MainCard'
import Transitions from 'ui-component/extended/Transitions'
// assets
import FiberManualRecordIcon from '@mui/icons-material/FiberManualRecord'
import databaseApi from 'api/database'
// ==============================|| SIDEBAR MENU LIST ITEMS ||============================== //

const NavItem = ({ item, level, navType, onClick, username, handleLogout, trigger }) => {
    const theme = useTheme()
    const dispatch = useDispatch()
    const navigate = useNavigate()
    const customization = useSelector((state) => state.customization)
    const matchesSM = useMediaQuery(theme.breakpoints.down('lg'))
    const [open, setOpen] = useState(false)
    const [loading, setLoading] = useState(false)
    const [aboutDialogOpen, setAboutDialogOpen] = useState(false)

    const Icon = item.icon
    const itemIcon = item?.icon ? (
        <Icon stroke={1.5} line-height='24px' fontSize='14px' fontWeight='400' />
    ) : (
        <FiberManualRecordIcon
            sx={{
                width: customization.isOpen.findIndex((id) => id === item?.id) > -1 ? 8 : 6,
                height: customization.isOpen.findIndex((id) => id === item?.id) > -1 ? 8 : 6
            }}
            fontSize={level > 0 ? 'inherit' : 'medium'}
        />
    )

    let itemTarget = '_self'
    if (item.target && item.url) {
        itemTarget = '_blank'
    }

    let listItemProps = {
        component: forwardRef(function ListItemPropsComponent(props, ref) {
            if (item?.url) {
                return <Link ref={ref} {...props} to={`${config.basename}${item.url}`} target={itemTarget} />
            } else {
                return <Link ref={ref} {...props} target={itemTarget} />
            }
        })
    }
    if (item.id === 'expandList' || item.id === 'settings') {
        listItemProps = { component: 'a', target: itemTarget }
    } else if (item?.external) {
        listItemProps = { component: 'a', href: item.url, target: itemTarget }
    }
    if (item?.id === 'loadChatflow') {
        listItemProps.component = 'label'
    }
    const handleExportDB = async () => {
        setOpen(false)
        try {
            const response = await databaseApi.getExportDatabase()
            const exportItems = response.data
            let dataStr = JSON.stringify(exportItems)
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

    const handleToggle = () => {
        setOpen((prevOpen) => !prevOpen)
    }
    const anchorRef = useRef(null)
    const uploadRef = useRef(null)

    const handleClose = (event) => {
        if (anchorRef.current && anchorRef.current.contains(event.target)) {
            return
        }
        setOpen(false)
    }

    const itemHandler = (id) => {
        if (navType === 'SETTINGS' && id !== 'loadChatflow') {
            onClick(id)
        } else if (navType === 'MENU' && id === 'expandList') {
            onClick('expand')
        } else if (navType === 'MENU' && id === 'settings') {
            handleToggle()
        } else {
            dispatch({ type: MENU_OPEN, id })
            if (matchesSM) dispatch({ type: SET_MENU, opened: false })
        }
    }

    useEffect(() => {
        if (trigger) {
            handleToggle()
        }
    }, [trigger])

    // active menu item on page load
    useEffect(() => {
        if (navType === 'MENU') {
            if (!document.location.pathname.toString().split('/')[1]) {
                itemHandler('chatflows')
            }
        }

        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [navType])

    return (
        <>
            {' '}
            <ListItemButton
                ref={anchorRef}
                {...listItemProps}
                disabled={item.disabled}
                sx={{
                    color: 'white',
                    height: '49px',
                    '&$selected': {
                        backgroundColor: 'inherit',
                        color: 'white',
                        '& .MuiListItemIcon-root': {
                            color: 'white'
                        }
                    },
                    '&$selected:hover': {
                        backgroundColor: 'inherit',
                        color: 'white',
                        '& .MuiListItemIcon-root': {
                            color: 'white'
                        }
                    },
                    '&:hover': {
                        backgroundColor: 'inherit',
                        color: 'white',
                        '& .MuiListItemIcon-root': {
                            color: 'white'
                        }
                    }
                }}
                selected={customization.isOpen.findIndex((id) => id === item.id) > -1}
                onClick={() => {
                    itemHandler(item.id)
                }}
            >
                {item.id === 'loadChatflow' && <input type='file' hidden accept='.json' onChange={(e) => handleFileUpload(e)} />}
                <ListItemIcon
                    sx={{
                        my: 'auto',
                        minWidth: !item?.icon ? 18 : 44,
                        color: 'white'
                    }}
                >
                    {itemIcon}
                </ListItemIcon>
                <ListItemText
                    primary={
                        <Typography variant='body2' color='inherit'>
                            {item.title}
                        </Typography>
                    }
                    secondary={
                        item.caption && (
                            <Typography
                                variant='caption'
                                color='#027D45'
                                sx={{
                                    ...theme.typography.subMenuCaption
                                }}
                                display='block'
                                gutterBottom
                            >
                                {item.caption}
                            </Typography>
                        )
                    }
                />
                {item.chip && (
                    <Chip
                        color={item.chip.color}
                        variant={item.chip.variant}
                        size={item.chip.size}
                        label={item.chip.label}
                        avatar={item.chip.avatar && <Avatar>{item.chip.avatar}</Avatar>}
                    />
                )}
            </ListItemButton>{' '}
            <Popper
                sx={{ zIndex: 10000 }}
                placement='bottom-end'
                open={open}
                anchorEl={anchorRef.current}
                role={undefined}
                transition
                popperOptions={{
                    modifiers: [
                        {
                            name: 'offset',
                            options: {
                                offset: [60, 0]
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
                                                        <IconFileDownload stroke={1.5} size='1.3rem' />
                                                    </ListItemIcon>
                                                    <ListItemText primary={<Typography variant='body2'>Load Database</Typography>} />
                                                </ListItemButton>
                                                <ListItemButton
                                                    sx={{ borderRadius: `${customization.borderRadius}px` }}
                                                    onClick={handleExportDB}
                                                >
                                                    <ListItemIcon>
                                                        <IconFileExport stroke={1.5} size='1.3rem' />
                                                    </ListItemIcon>
                                                    <ListItemText primary={<Typography variant='body2'>Export Database</Typography>} />
                                                </ListItemButton>
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
            <input ref={uploadRef} type='file' hidden accept='.json' onChange={(e) => handleFileUpload(e)} />
            <BackdropLoader open={loading} />
            <AboutDialog show={aboutDialogOpen} onCancel={() => setAboutDialogOpen(false)} />
        </>
    )
}

NavItem.propTypes = {
    item: PropTypes.object,
    level: PropTypes.number,
    navType: PropTypes.string,
    onClick: PropTypes.func,
    onUploadFile: PropTypes.func,
    username: PropTypes.string,
    handleLogout: PropTypes.func,
    trigger: PropTypes.number
}

export default NavItem
