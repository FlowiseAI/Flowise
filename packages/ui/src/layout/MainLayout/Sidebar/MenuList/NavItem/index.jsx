import PropTypes from 'prop-types'
import { useState, useRef, forwardRef, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import AboutDialog from '@/ui-component/dialog/AboutDialog'

// material-ui
import { useTheme } from '@mui/material/styles'
import {
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
    List
} from '@mui/material'

// third-party
import { IconInfoCircle } from '@tabler/icons-react'
import PerfectScrollbar from 'react-perfect-scrollbar'

// project imports
import { MENU_OPEN, SET_MENU } from '@/store/actions'
import config from '@/config'
import MainCard from '@/ui-component/cards/MainCard'
import Transitions from '@/ui-component/extended/Transitions'

// assets
import FiberManualRecordIcon from '@mui/icons-material/FiberManualRecord'

// ==============================|| SIDEBAR MENU LIST ITEMS ||============================== //

const NavItem = ({ item, level, navType, onClick, onUploadFile, trigger }) => {
    const theme = useTheme()
    const dispatch = useDispatch()
    const customization = useSelector((state) => state.customization)
    const matchesSM = useMediaQuery(theme.breakpoints.down('lg'))
    const [open, setOpen] = useState(false)
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
            if (item?.url || navType === 'SETTINGS') {
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

    const handleToggle = () => {
        setOpen((prevOpen) => !prevOpen)
    }
    const anchorRef = useRef(null)

    const handleClose = (event) => {
        if (anchorRef.current && anchorRef.current.contains(event.target)) {
            return
        }
        setOpen(false)
    }

    const handleFileUpload = (e) => {
        if (!e.target.files) return

        const file = e.target.files[0]

        const reader = new FileReader()
        reader.onload = (evt) => {
            if (!evt?.target?.result) {
                return
            }
            const { result } = evt.target
            onUploadFile(result)
        }
        reader.readAsText(file)
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
                    color: 'inherit',
                    ...(navType == 'MENU' && {
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
                    }),
                    ...(navType != 'MENU' && {
                        borderRadius: `${customization.borderRadius}px`,
                        mb: 0.5,
                        alignItems: 'flex-start',
                        backgroundColor: level > 1 ? 'transparent !important' : 'inherit',
                        py: level > 1 ? 1 : 1.25,
                        pl: `${level * 24}px`
                    })
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
                        ...(navType == 'MENU' && {
                            color: 'white'
                        })
                    }}
                >
                    {itemIcon}
                </ListItemIcon>
                <ListItemText
                    primary={
                        <Typography
                            variant={customization.isOpen.findIndex((id) => id === item.id) > -1 ? 'h5' : 'body1'}
                            color='inherit'
                            sx={{ my: 0.5 }}
                        >
                            {item.title}
                        </Typography>
                    }
                    secondary={
                        item.caption && (
                            <Typography
                                variant='caption'
                                color='#027D45'
                                sx={{
                                    ...theme.typography.subMenuCaption,
                                    mt: -0.6
                                }}
                                display='block'
                                gutterBottom
                            >
                                {item.caption}
                            </Typography>
                        )
                    }
                    sx={{ my: 'auto' }}
                />
                {item.isBeta && (
                    <Chip
                        sx={{
                            my: 'auto',
                            width: 'max-content',
                            fontWeight: 700,
                            fontSize: '0.65rem',
                            background: theme.palette.teal.main,
                            color: 'white'
                        }}
                        label={'BETA'}
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
                                    <PerfectScrollbar style={{ height: '100%', maxHeight: 'calc(100vh - 250px)', overflowX: 'hidden' }}>
                                        <Box sx={{ p: 2 }}>
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
                                                        setAboutDialogOpen(true)
                                                    }}
                                                >
                                                    <ListItemIcon>
                                                        <IconInfoCircle stroke={1.5} size='1.3rem' />
                                                    </ListItemIcon>
                                                    <ListItemText primary={<Typography variant='body2'>About</Typography>} />
                                                </ListItemButton>
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

NavItem.propTypes = {
    item: PropTypes.object,
    level: PropTypes.number,
    navType: PropTypes.string,
    onClick: PropTypes.func,
    onUploadFile: PropTypes.func,
    trigger: PropTypes.number
}

export default NavItem
