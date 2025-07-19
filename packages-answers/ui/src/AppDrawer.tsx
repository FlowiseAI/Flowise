'use client'
import type React from 'react'
import { useState } from 'react'
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
import type { AppBarProps as MuiAppBarProps } from '@mui/material/AppBar'
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
import AssessmentOutlinedIcon from '@mui/icons-material/AssessmentOutlined'
import AppsOutlinedIcon from '@mui/icons-material/AppsOutlined'
import PlayCircleOutlineIcon from '@mui/icons-material/PlayCircleOutline'
import { ExportImportMenuItems } from './components/ExportImportComponent'
import { useSubscriptionDialog } from './SubscriptionDialogContext'

import ChatDrawer from './ChatDrawer'
import StarIcon from '@mui/icons-material/Star'
import StorefrontOutlinedIcon from '@mui/icons-material/StorefrontOutlined'

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

interface AppDrawerProps {
    session: {
        user: {
            picture?: string
            email?: string
            org_name?: string
            subscription?: unknown
            defaultChatflowId?: string
        }
    }
    flagsmithState: unknown
}

export const AppDrawer = ({ session, flagsmithState }: AppDrawerProps) => {
    const user = session?.user
    const [drawerOpen, setDrawerOpen] = useState(true) // Changed to true for open by default
    const [submenuOpen, setSubmenuOpen] = useState('')
    const { openDialog: openSubscriptionDialog, closeDialog: closeSubscriptionDialog } = useSubscriptionDialog()
    const pathname = usePathname()
    const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null)
    const flags = useFlags(['chatflow:use', 'chatflow:manage', 'org:manage'])
    const MEMBER_ACTIONS = [
        'chatflows',
        'executions',
        'marketplaces',
        'agentflows',
        'documentstores',
        'apikey',
        'credentials',
        'billing',
        'apps'
    ]
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

    // Restructured menu configuration
    const menuConfig: MenuConfig[] = filterMenuItems([
        // Marketplaces moved to top level
        ...(flags['chatflow:use'].enabled
            ? [
                  {
                      id: 'marketplaces',
                      text: 'Sidekick Store',
                      link: '/sidekick-studio/marketplaces',
                      icon: <StorefrontOutlinedIcon color='primary' />
                  }
              ]
            : []),
        // Studio section (collapsible) with Assistants and Document Stores moved in
        ...(flags['chatflow:use'].enabled
            ? [
                  {
                      id: 'studio',
                      text: 'Sidekick Studio',
                      icon: <BuildOutlinedIcon color='primary' />,
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
                              id: 'assistants',
                              text: 'Assistants',
                              link: '/sidekick-studio/assistants',
                              icon: <GroupsOutlinedIcon color='primary' />
                          },
                          {
                              id: 'documentstores',
                              text: 'Document Stores',
                              link: '/sidekick-studio/document-stores',
                              icon: <MenuBookOutlinedIcon color='primary' />
                          },
                          {
                              id: 'executions',
                              text: 'Executions',
                              link: '/sidekick-studio/executions',
                              icon: <PlayCircleOutlineIcon color='primary' />
                          },
                          {
                              id: 'tools',
                              text: 'Tools',
                              link: '/sidekick-studio/tools',
                              icon: <BuildOutlinedIcon color='primary' />
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
                          }
                      ]
                  }
              ]
            : []),
        // Account section (collapsible) with Credentials moved in
        ...(flags['chatflow:use'].enabled
            ? [
                  {
                      id: 'account',
                      text: 'Account',
                      icon: <AssessmentOutlinedIcon color='primary' />,
                      subMenu: [
                          {
                              id: 'billing',
                              text: 'Billing',
                              link: '/billing',
                              icon: <AssessmentOutlinedIcon color='primary' />
                          },
                          {
                              id: 'credentials',
                              text: 'Credentials',
                              link: '/sidekick-studio/credentials',
                              icon: <PasswordIcon color='primary' />
                          }
                      ]
                  }
              ]
            : [])
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

    const handleNewChat = () => {
        setDrawerOpen(false)
    }

    const handleSubscriptionOpen = () => {
        openSubscriptionDialog()
        handleClose()
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
                        {flags['chatflow:manage'].enabled &&
                            (drawerOpen ? (
                                <Tooltip title='Manage and configure your applications' placement='right'>
                                    <Button
                                        href='/sidekick-studio/apps'
                                        variant='outlined'
                                        component={NextLink}
                                        startIcon={<AppsOutlinedIcon />}
                                        sx={{
                                            minWidth: 0,
                                            textTransform: 'capitalize',
                                            justifyContent: 'flex-start',
                                            ml: 1
                                        }}
                                    >
                                        Apps
                                    </Button>
                                </Tooltip>
                            ) : (
                                <Tooltip title='Manage and configure your applications' placement='right'>
                                    <IconButton component={NextLink} href='/sidekick-studio/apps'>
                                        <AppsOutlinedIcon sx={{ color: 'primary.main' }} />
                                    </IconButton>
                                </Tooltip>
                            ))}
                        {drawerOpen ? (
                            <Tooltip title='Start a new conversation with your sidekicks' placement='right'>
                                <Button
                                    href={user?.defaultChatflowId ? `/chat/${user.defaultChatflowId}` : '/chat'}
                                    variant='outlined'
                                    component={NextLink}
                                    onClick={handleNewChat}
                                    startIcon={<RateReviewIcon />}
                                    sx={{
                                        minWidth: 0,
                                        textTransform: 'capitalize',
                                        justifyContent: 'flex-start',
                                        ml: 1
                                    }}
                                >
                                    Chat
                                </Button>
                            </Tooltip>
                        ) : (
                            <Tooltip title='Start a new conversation with your sidekicks' placement='right'>
                                <IconButton
                                    component={NextLink}
                                    href={user?.defaultChatflowId ? `/chat/${user.defaultChatflowId}` : '/chat'}
                                    onClick={handleNewChat}
                                >
                                    <RateReviewIcon sx={{ color: 'primary.main' }} />
                                </IconButton>
                            </Tooltip>
                        )}
                    </Box>
                </Box>
                {/* Chat History */}
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
                    <ChatDrawer />
                </Box>

                <List sx={{ display: 'flex', flexDirection: 'column', px: 1 }} disablePadding>
                    {menuConfig.map((item, index) => {
                        // Define tooltips for main menu items
                        const getMainMenuTooltip = (itemId: string) => {
                            switch (itemId) {
                                case 'marketplaces':
                                    return 'Browse and install sidekicks from the marketplace'
                                case 'studio':
                                    return 'Build and customize your own sidekicks'
                                case 'account':
                                    return 'Manage your account settings and preferences'
                                default:
                                    return ''
                            }
                        }

                        return (
                            <Box key={item.text || index} sx={{ mb: item.id === 'documentstores' ? 2 : 0 }}>
                                <ListItem disablePadding>
                                    {item.text && (
                                        <Tooltip title={getMainMenuTooltip(item.id || '')} placement='right'>
                                            <ListItemButton
                                                selected={!!item.link && pathname.startsWith(item.link)}
                                                href={item.link}
                                                component={item.link ? NextLink : 'button'}
                                                sx={{ flex: 1, display: 'flex', width: '100%' }}
                                                onClick={() => {
                                                    if (item.subMenu) {
                                                        setSubmenuOpen(item.text === submenuOpen ? '' : item.text ?? '')
                                                    }
                                                }}
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
                                        </Tooltip>
                                    )}
                                </ListItem>

                                {/* Render submenu items if they exist */}
                                {item.subMenu && (
                                    <Collapse key={`${item.text}-collapse`} in={submenuOpen === item.text} timeout='auto'>
                                        {item.subMenu.map((subItem) => {
                                            // Define tooltips for submenu items
                                            const getSubmenuTooltip = (subItemId: string) => {
                                                switch (subItemId) {
                                                    case 'chatflows':
                                                        return 'Create conversation flows and logic'
                                                    case 'agentflows':
                                                        return 'Design multi-agent workflows'
                                                    case 'assistants':
                                                        return 'Manage your AI assistants'
                                                    case 'documentstores':
                                                        return 'Organize and manage your knowledge base'
                                                    case 'executions':
                                                        return 'Monitor and review execution history'
                                                    case 'tools':
                                                        return 'Configure tools and integrations'
                                                    case 'variables':
                                                        return 'Set up variables for reuse across sidekicks'
                                                    case 'apikey':
                                                        return 'Manage authentication keys for external services'
                                                    case 'billing':
                                                        return 'View and manage your subscription and payments'
                                                    case 'credentials':
                                                        return 'Store and manage API credentials securely'
                                                    default:
                                                        return subItem.text || ''
                                                }
                                            }

                                            return (
                                                <ListItem key={subItem.text} disablePadding sx={{ pl: 2 }}>
                                                    <Tooltip title={getSubmenuTooltip(subItem.id || '')} placement='right'>
                                                        <ListItemButton
                                                            component={subItem.link ? NextLink : 'button'}
                                                            href={subItem.link || '#'}
                                                            selected={pathname === subItem.link}
                                                            sx={{ width: '100%' }}
                                                        >
                                                            <ListItemIcon sx={{ minWidth: 40 }}>{subItem.icon}</ListItemIcon>
                                                            <Typography>{subItem.text}</Typography>
                                                        </ListItemButton>
                                                    </Tooltip>
                                                </ListItem>
                                            )
                                        })}
                                    </Collapse>
                                )}
                            </Box>
                        )
                    })}

                    {!user?.subscription && (
                        <ListItem disablePadding>
                            <Tooltip title='Unlock premium features with a subscription' placement='right'>
                                <ListItemButton
                                    onClick={handleSubscriptionOpen}
                                    sx={{
                                        bgcolor: 'primary.main',
                                        '&:hover': { bgcolor: 'primary.dark' },
                                        borderRadius: 1,
                                        mb: 1,
                                        width: '100%'
                                    }}
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
                                        Upgrade Plan
                                    </Typography>
                                </ListItemButton>
                            </Tooltip>
                        </ListItem>
                    )}

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

                                <ExportImportMenuItems onClose={handleClose} />
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
        </>
    )
}

interface AppBarProps extends MuiAppBarProps {
    open?: boolean
}

export default AppDrawer
