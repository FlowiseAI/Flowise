'use client'
import React, { useState } from 'react'
import NextLink from 'next/link'
import { styled } from '@mui/material/styles'
import Avatar from '@mui/material/Avatar'
import Box from '@mui/material/Box'
import List from '@mui/material/List'
import ListItem from '@mui/material/ListItem'
import ListItemButton from '@mui/material/ListItemButton'
import MuiDrawer from '@mui/material/Drawer'
import ListItemIcon from '@mui/material/ListItemIcon'
import RateReviewIcon from '@mui/icons-material/RateReview'
import ViewSidebarOutlinedIcon from '@mui/icons-material/ViewSidebarOutlined'
import Button from '@mui/material/Button'
import Typography from '@mui/material/Typography'
import IconButton from '@mui/material/IconButton'
import Collapse from '@mui/material/Collapse'
import { AppBarProps as MuiAppBarProps } from '@mui/material/AppBar'
import MoreVertIcon from '@mui/icons-material/MoreVert'
import { usePathname } from 'next/navigation'
import { Menu, MenuItem, Tooltip } from '@mui/material'
import { useFlags } from 'flagsmith/react'
import AccountTreeIcon from '@mui/icons-material/AccountTree'
import GroupsOutlinedIcon from '@mui/icons-material/GroupsOutlined'
import MenuBookOutlinedIcon from '@mui/icons-material/MenuBookOutlined'
import BuildOutlinedIcon from '@mui/icons-material/BuildOutlined'
import PasswordIcon from '@mui/icons-material/Password'
import IntegrationInstructionsOutlinedIcon from '@mui/icons-material/IntegrationInstructionsOutlined'
import VpnKeyOutlinedIcon from '@mui/icons-material/VpnKeyOutlined'
import ContactSupport from '@mui/icons-material/ContactSupport'
import AppsOutlinedIcon from '@mui/icons-material/AppsOutlined'
import AssessmentIcon from '@mui/icons-material/Assessment'
import { useHelpChatContext } from './HelpChatContext' // Import the context
import Dialog from '@mui/material/Dialog'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import PurchaseSubscription from './billing/PurchaseSubscription'

const drawerWidth = 240

const Drawer = styled(MuiDrawer, { shouldForwardProp: (prop) => prop !== 'open' })(({ theme, open }) => ({
    width: drawerWidth,
    maxWidth: open ? drawerWidth : theme.spacing(7),
    flexShrink: 0,
    whiteSpace: 'nowrap',
    overflowX: 'hidden',
    transition: '.3s',
    ' .MuiDrawer-paper': {
        transition: '.3s',
        overflowY: 'hidden',
        overflowX: 'hidden',
        padding: 0, // Remove padding here
        width: drawerWidth
    },
    p: {
        transition: '.2s'
    },
    ...(open && {
        '& .MuiDrawer-paper': {
            transition: '.3s',
            maxWidth: drawerWidth
        }
    }),
    ...(!open && {
        '& .MuiDrawer-paper': {
            transition: '.3s',
            maxWidth: theme.spacing(7),
            p: {
                opacity: 0
            }
        }
    })
}))

interface MenuConfig {
    id?: string
    text?: string
    link?: string
    icon?: React.ReactNode
    subMenu?: MenuConfig[]
}

export const AppDrawer = ({ session, chatList, flagsmithState }: any) => {
    const { helpChatOpen, setHelpChatOpen } = useHelpChatContext()
    const user = session?.user
    const [drawerOpen, setDrawerOpen] = useState(false)
    const [submenuOpen, setSubmenuOpen] = useState('')
    const [subscriptionDialogOpen, setSubscriptionDialogOpen] = useState(false)
    const pathname = usePathname()
    const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null)
    const flags = useFlags(['chatflow:use', 'chatflow:manage', 'org:manage'])
    const MEMBER_ACTIONS = ['chatflows', 'agentflows', 'document-stores', 'billing']
    const BUILDER_ACTIONS = ['agentflows', 'assistants', 'tools', 'credentials', 'variables', 'apikey', 'documentstores', 'admin', 'apps']

    const filterMenuItems = (items: MenuConfig[]) => {
        return items.map((item) => {
            if (!item.subMenu) return item
            const filteredSubMenu = item.subMenu.filter((subItem) => {
                const isMemberAction = MEMBER_ACTIONS.includes(subItem.id ?? '')
                const isBuilderAction = BUILDER_ACTIONS.includes(subItem.id ?? '')
                return (isMemberAction && flags['chatflow:use'].enabled) || (isBuilderAction && flags['chatflow:manage'].enabled)
            })
            return { ...item, subMenu: filteredSubMenu }
        })
    }
    const menuConfig: MenuConfig[] = filterMenuItems([
        {
            ...(flags['chatflow:use'].enabled
                ? {
                      subMenu: [
                          {
                              id: 'chatflows',
                              text: 'Chatflows',
                              link: '/sidekick-studio/chatflows',
                              icon: <AccountTreeIcon color='primary' />
                          },
                          {
                              id: 'agentflows',
                              text: 'Agentflows',
                              link: '/sidekick-studio/agentflows',
                              icon: <GroupsOutlinedIcon color='primary' />
                          },
                          {
                              id: 'documentstores',
                              text: 'Document Stores',
                              link: '/sidekick-studio/document-stores',
                              icon: <MenuBookOutlinedIcon color='primary' />
                          },
                          {
                              id: 'tools',
                              text: 'Tools',
                              link: '/sidekick-studio/tools',
                              icon: <BuildOutlinedIcon color='primary' />
                          },
                          {
                              id: 'credentials',
                              text: 'Credentials',
                              link: '/sidekick-studio/credentials',
                              icon: <PasswordIcon color='primary' />
                          },
                          {
                              id: 'variables',
                              text: 'Global Variables',
                              link: '/sidekick-studio/variables',
                              icon: <IntegrationInstructionsOutlinedIcon color='primary' />
                          },
                          {
                              id: 'apikey',
                              text: 'API Keys',
                              link: '/sidekick-studio/apikey',
                              icon: <VpnKeyOutlinedIcon color='primary' />
                          },
                          //   {
                          //       id: 'admin',
                          //       text: 'Admin',
                          //       link: '/sidekick-studio/admin',
                          //       icon: <AdminOutlinedIcon color='primary' />
                          //   },
                          {
                              id: 'billing',
                              text: 'Billing',
                              link: '/billing',
                              icon: <AssessmentIcon color='primary' />
                          },
                          {
                              id: 'apps',
                              text: 'Apps',
                              link: '/sidekick-studio/apps',
                              icon: <AppsOutlinedIcon color='primary' />
                          }
                      ]
                  }
                : {})
        }
    ])

    const handleClick = (event: React.MouseEvent<HTMLButtonElement | HTMLDivElement>) => {
        setAnchorEl(event.currentTarget)
    }

    const handleClose = () => {
        setAnchorEl(null)
    }

    const toggleDrawer = () => {
        setDrawerOpen(!drawerOpen)
    }

    const toggleHelpChat = () => {
        setHelpChatOpen(!helpChatOpen)
    }

    const handleNewChat = () => {
        setDrawerOpen(false)
    }

    const handleSubscriptionOpen = () => {
        setSubscriptionDialogOpen(true)
        handleClose()
    }

    const handleSubscriptionClose = () => {
        setSubscriptionDialogOpen(false)
    }

    return (
        <>
            <Drawer open={drawerOpen} variant='permanent' className={drawerOpen ? 'MuiDrawer-open' : 'MuiDrawer-closed'} sx={{}}>
                <Box
                    sx={{
                        display: 'flex',
                        justifyContent: drawerOpen ? 'space-between' : 'center',
                        flexDirection: 'column',
                        p: 1
                    }}
                >
                    <Box
                        sx={{
                            display: 'flex',
                            flexDirection: drawerOpen ? 'row' : 'column',
                            p: 1
                        }}
                    >
                        <IconButton onClick={toggleDrawer}>
                            <ViewSidebarOutlinedIcon
                                sx={{
                                    transform: drawerOpen ? 'scaleX(-1)' : 'none',
                                    color: 'primary.main'
                                }}
                            />
                        </IconButton>
                        <IconButton onClick={toggleHelpChat}>
                            <ContactSupport
                                sx={{
                                    transform: drawerOpen ? 'scaleX(1)' : 'none',
                                    color: 'primary.main'
                                }}
                            />
                        </IconButton>
                    </Box>
                    <Button
                        href='/chat'
                        variant='outlined'
                        onClick={handleNewChat}
                        component={NextLink}
                        endIcon={<RateReviewIcon />}
                        fullWidth
                        sx={{
                            minWidth: 0,
                            textTransform: 'capitalize',
                            justifyContent: 'space-between',
                            '.MuiDrawer-closed & .MuiButton-endIcon': {
                                margin: 0
                            }
                        }}
                    >
                        <Box
                            component='span'
                            sx={{
                                overflow: 'hidden',
                                transition: '.2s',
                                maxWidth: '240px',
                                '.MuiDrawer-closed &': {
                                    maxWidth: '0',
                                    opacity: 0
                                }
                            }}
                        >
                            New chat
                        </Box>
                    </Button>
                </Box>
                <Box
                    sx={{
                        flex: 1,
                        overflowY: 'auto',
                        overflowX: 'hidden',
                        '&::-webkit-scrollbar': {
                            transition: 'opacity 0.5s ease',
                            opacity: drawerOpen ? 1 : 0
                        },
                        '&::-webkit-scrollbar ': {
                            transition: '.2s',
                            ...(!drawerOpen && {
                                width: '0px'
                            })
                        }
                    }}
                >
                    {chatList}
                </Box>

                <List sx={{ display: 'flex', flexDirection: 'column' }} disablePadding>
                    {menuConfig.map((item, index) => (
                        <Box key={item.text || index}>
                            <ListItem disablePadding>
                                {item.text && (
                                    <ListItemButton
                                        selected={!!item.link && pathname.startsWith(item.link)}
                                        href={item.link}
                                        component={item.link ? NextLink : 'button'}
                                        sx={{ flex: 1, display: 'flex', width: '100%' }}
                                        onClick={() => setSubmenuOpen(item.text == submenuOpen ? '' : item.text ?? '')}
                                    >
                                        <ListItemIcon sx={{ minWidth: 40 }}>{item.icon}</ListItemIcon>
                                        <Typography
                                            sx={{
                                                overflow: 'hidden',
                                                textOverflow: 'ellipsis',
                                                textTransform: 'capitalize',
                                                display: '-webkit-box',
                                                WebkitBoxOrient: 'vertical',
                                                WebkitLineClamp: '1',
                                                flex: '1'
                                            }}
                                        >
                                            {item.text}
                                        </Typography>
                                    </ListItemButton>
                                )}
                            </ListItem>

                            <Collapse
                                key={`${item.text}-collapse`}
                                in={
                                    true
                                    // drawerOpen ||
                                    // (pathname && item?.link
                                    //     ? pathname.includes(item?.link)
                                    //     : item.subMenu
                                    //     ? item.subMenu?.findIndex((subItem) => pathname.includes(subItem.link)) !== -1
                                    //     : false)
                                }
                                timeout='auto'
                            >
                                {item.subMenu?.map((subItem) => (
                                    <ListItem key={subItem.text} disablePadding>
                                        <ListItemButton
                                            component={subItem.link ? NextLink : 'button'}
                                            href={subItem.link || '#'}
                                            selected={pathname === subItem.link}
                                        >
                                            <Tooltip title={drawerOpen ? null : subItem.text}>
                                                <ListItemIcon sx={{ minWidth: 40 }}>{subItem.icon}</ListItemIcon>
                                            </Tooltip>
                                            <Typography>{subItem.text}</Typography>
                                        </ListItemButton>
                                    </ListItem>
                                ))}
                            </Collapse>
                        </Box>
                    ))}

                    {/* <ListItem disablePadding>
                        <ListItemButton
                            onClick={handleSubscriptionOpen}
                            sx={{ bgcolor: 'primary.main', '&:hover': { bgcolor: 'primary.dark' }, borderRadius: 1, mb: 1 }}
                        >
                            <ListItemIcon>
                                <StarIcon sx={{ color: '#fff' }} />
                            </ListItemIcon>
                            <Typography
                                sx={{
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    textTransform: 'capitalize',
                                    display: '-webkit-box',
                                    WebkitBoxOrient: 'vertical',
                                    WebkitLineClamp: '1',
                                    flex: '1',
                                    color: '#fff'
                                }}
                            >
                                Buy Credits
                            </Typography>
                        </ListItemButton>
                    </ListItem> */}

                    <ListItem disablePadding sx={{ display: 'block' }}>
                        <Box
                            sx={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                width: '100%',
                                gap: 1,
                                pl: 0.5
                            }}
                        >
                            <Avatar
                                src={user?.picture}
                                sx={{
                                    bgcolor: 'secondary.main',
                                    height: '32px',
                                    width: '32px',
                                    cursor: 'pointer'
                                }}
                                onClick={handleClick}
                            />
                            <Box
                                sx={{
                                    display: 'flex',
                                    overflow: 'hidden',
                                    alignItems: 'center',
                                    width: '100%',
                                    maxWidth: 124
                                }}
                            >
                                <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                                    <Typography
                                        variant='caption'
                                        sx={{
                                            width: '100%',
                                            overflow: 'hidden',
                                            textOverflow: 'ellipsis',
                                            whiteSpace: 'nowrap'
                                        }}
                                    >
                                        {user?.email}
                                    </Typography>
                                    <Typography
                                        variant='caption'
                                        sx={{
                                            width: '100%',
                                            overflow: 'hidden',
                                            textOverflow: 'ellipsis',
                                            whiteSpace: 'nowrap'
                                        }}
                                    >
                                        {user?.org_name}
                                    </Typography>
                                </Box>
                            </Box>
                            <IconButton
                                aria-label='more options'
                                sx={{ minHeight: 48, width: 48, justifyContent: 'center' }}
                                aria-controls='simple-menu'
                                aria-haspopup='true'
                                onClick={handleClick}
                            >
                                <MoreVertIcon />
                            </IconButton>
                            <Menu id='simple-menu' anchorEl={anchorEl} keepMounted open={Boolean(anchorEl)} onClose={handleClose}>
                                <MenuItem disabled>
                                    <Typography
                                        variant='caption'
                                        sx={{
                                            opacity: 0.9,
                                            width: '100%',
                                            overflow: 'hidden',
                                            textOverflow: 'ellipsis',
                                            whiteSpace: 'nowrap'
                                        }}
                                    >
                                        {user?.org_name}
                                    </Typography>
                                </MenuItem>
                                <MenuItem onClick={handleSubscriptionOpen}>Upgrade Plan</MenuItem>

                                <MenuItem
                                    onClick={() => {
                                        handleClose()
                                        window.location.href = '/api/auth/login'
                                    }}
                                >
                                    Switch Organization
                                </MenuItem>
                                <MenuItem
                                    onClick={() => {
                                        handleClose()
                                        window.location.href = '/api/auth/logout'
                                    }}
                                >
                                    Sign Out
                                </MenuItem>
                            </Menu>
                        </Box>
                    </ListItem>
                </List>
            </Drawer>
            <Dialog
                open={subscriptionDialogOpen}
                onClose={handleSubscriptionClose}
                fullWidth
                maxWidth='md'
                aria-labelledby='subscription-dialog-title'
            >
                <DialogTitle sx={{ fontSize: '1rem' }} id='subscription-dialog-title'>
                    Upgrade your plan
                </DialogTitle>
                <DialogContent>
                    <PurchaseSubscription />
                </DialogContent>
            </Dialog>
        </>
    )
}

interface AppBarProps extends MuiAppBarProps {
    open?: boolean
}

export default AppDrawer
