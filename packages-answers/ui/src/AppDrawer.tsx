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

import Typography from '@mui/material/Typography'
import IconButton from '@mui/material/IconButton'
import Collapse from '@mui/material/Collapse'
import { AppBarProps as MuiAppBarProps } from '@mui/material/AppBar'

import SettingsIcon from '@mui/icons-material/Settings'
import ExitToAppIcon from '@mui/icons-material/ExitToApp'
import SmartToy from '@mui/icons-material/SmartToy'
import MoreVertIcon from '@mui/icons-material/MoreVert'
import AIIcon from '@mui/icons-material/SmartButton'
import { usePathname } from 'next/navigation'
import { Menu, MenuItem } from '@mui/material'
import { useFlags } from 'flagsmith/react'

const drawerWidth = 240

const Drawer = styled(MuiDrawer, { shouldForwardProp: (prop) => prop !== 'open' })(({ theme, open }) => ({
    width: drawerWidth,
    maxWidth: open ? drawerWidth : theme.spacing(7),
    flexShrink: 0,
    whiteSpace: 'nowrap',
    overflowX: 'hidden',
    transition: '.3s',
    // 'transition': theme.transitions.create('width', {
    //   easing: theme.transitions.easing.sharp,
    //   duration: theme.transitions.duration.enteringScreen
    // }),
    ' .MuiDrawer-paper': {
        transition: '.3s',
        overflowY: 'hidden',
        overflowX: 'hidden',
        padding: 0,
        width: drawerWidth
    },
    p: {
        transition: '.2s'
    },
    ...(open && {
        '& .MuiDrawer-paper': {
            transition: '.3s',
            maxWidth: drawerWidth
            // onMouseEnter: () => setDrawerOpen(true),
            // onMouseLeave: () => setDrawerOpen(false)
        }
    }),
    ...(!open && {
        '& .MuiDrawer-paper': {
            transition: '.3s',
            maxWidth: theme.spacing(7),
            p: {
                opacity: 0
            }
            // onMouseEnter: () => setDrawerOpen(true),
            // onMouseLeave: () => setDrawerOpen(false)
        }
    })
}))

export const AppDrawer = ({ session, chatList, flagsmithState }: any) => {
    const user = session?.user
    const [drawerOpen, setDrawerOpen] = useState(false)
    const [submenuOpen, setSubmenuOpen] = useState('')
    const pathname = usePathname()
    const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null)
    const flags = useFlags(['chatflow:use', 'chatflow:manage', 'org:manage'])
    const MEMBER_ACTIONS = ['chatflows', 'marketplaces', 'document-stores']
    const BUILDER_ACTIONS = ['agentflows', 'assistants', 'tools', 'credentials', 'variables', 'apikey', 'documentstores']
    const menuConfig = [
        // {
        //   text: 'New Chat',
        //   link: '/chat',
        //   icon: <MessageIcon />
        //   // subMenu: [
        //   //   { text: 'Dashboard', link: '/' },
        //   //   { text: 'New Chat', link: '/chat' },
        //   //   { text: 'New Project', link: '/journey/new' }
        //   // ]
        // },
        {
            ...(flags['chatflow:use'].enabled
                ? {
                      text: 'Sidekick Studio',
                      link: '/sidekick-studio',
                      icon: <SmartToy />,
                      subMenu: [
                          { id: 'chatflows', text: 'Chatflows', link: '/sidekick-studio/chatflows' },
                          { id: 'agentflows', text: 'Agentflows', link: '/sidekick-studio/agentflows' },
                          { id: 'tools', text: 'Tools', link: '/sidekick-studio/tools' },
                          { id: 'assistants', text: 'Assistants', link: '/sidekick-studio/assistants' },
                          { id: 'credentials', text: 'Credentials', link: '/sidekick-studio/credentials' },
                          { id: 'variables', text: 'Variables', link: '/sidekick-studio/variables' },
                          { id: 'apikey', text: 'API Keys', link: '/sidekick-studio/apikey' },
                          {
                              id: 'documentstores',
                              text: 'Document Stores',
                              link: '/sidekick-studio/document-stores'
                          }
                      ]?.filter(
                          (item) =>
                              // menu list collapse & items
                              (MEMBER_ACTIONS?.includes(item.id) && flags['chatflow:use']?.enabled) ||
                              (BUILDER_ACTIONS?.includes(item.id) && flags['chatflow:manage']?.enabled)
                      )
                  }
                : {})
        }
        // { text: 'Knowledge Base', link: '/knowledge-base', icon: <AIIcon /> },
        // {
        //   text: 'Settings',
        //   // link: '/settings',
        //   icon: <SettingsIcon />,
        //   subMenu: [
        //     { text: 'Organization', link: '/settings/organization' },
        //     { text: 'User', link: '/settings/user' }
        //   ]
        // }
        // { text: 'Knowledge Base', link: '/knowledge-base', icon: <AIIcon /> },
        // {
        //   text: 'Settings',
        //   // link: '/settings',
        //   icon: <SettingsIcon />,
        //   subMenu: [
        //     { text: 'Organization', link: '/settings/organization' },
        //     { text: 'User', link: '/settings/user' }
        //   ]
        // }
        // {
        //   text: 'Developer',
        //   // link: '#',
        //   icon: <StorageIcon />,
        //   subMenu: [
        //     { text: 'Ingest', link: '/developer/ingest' },
        //     { text: 'Prisma', link: '/developer/prisma' },
        //     { text: 'Tracing', link: '/developer/tracing' },
        //     { text: 'API Keys', link: '/developer/apikey' }
        //   ]
        // }
    ]
    const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
        setAnchorEl(event.currentTarget)
    }

    const handleClose = () => {
        setAnchorEl(null)
    }
    // Drawer style based on open state
    const drawerStyle = {
        width: drawerOpen ? drawerWidth : 0, // Adjust width based on state
        flexShrink: 0,
        whiteSpace: 'nowrap',
        boxSizing: 'border-box',
        transition: 'width 0.5s ease'
    }

    // Updated Drawer component to include onMouseEnter and onMouseLeave

    return (
        <Drawer
            open={drawerOpen}
            variant='permanent'
            onMouseEnter={() => setDrawerOpen(!!session && true)}
            onMouseLeave={() => setDrawerOpen(false)}
            className={drawerOpen ? 'MuiDrawer-open' : 'MuiDrawer-closed'}
            sx={{}}
        >
            {/* <DrawerHeader sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
        <NextLink href="/">
          <Avatar sx={{ objectFit: 'contain' }}>AI</Avatar>
        </NextLink>
      </DrawerHeader> */}
            <Box
                sx={{
                    flex: 1,
                    // 'overflowY': drawerOpen ? 'auto' : 'hidden',
                    overflowY: 'auto',
                    overflowX: 'hidden',

                    //Make the scrollbar animate to hidden when drawerOpen is false
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
                {menuConfig.map((item) => (
                    <Box key={item.text} onMouseEnter={() => setSubmenuOpen(item.text)} onMouseLeave={() => setSubmenuOpen('')}>
                        <ListItem disablePadding>
                            <ListItemButton
                                selected={!!item.link && pathname.startsWith(item.link)}
                                href={item.link}
                                component={item.link ? NextLink : 'button'}
                                sx={{ flex: 1, display: 'flex', width: '100%' }}
                                onClick={() => setSubmenuOpen(item.text == submenuOpen ? '' : item.text)}
                            >
                                <ListItemIcon>{item.icon}</ListItemIcon>
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
                        </ListItem>

                        <Collapse
                            in={drawerOpen && (submenuOpen === item?.text || item?.subMenu?.some((subItem) => pathname === subItem.link))}
                            timeout='auto'
                            sx={{ transition: '.2s', opacity: drawerOpen ? 1 : 0 }}
                        >
                            {item?.subMenu?.map((subItem) => (
                                <ListItem key={subItem.text} disablePadding sx={{ pl: 4, transition: '.2s', opacity: drawerOpen ? 1 : 0 }}>
                                    <ListItemButton component={NextLink} href={subItem.link} selected={pathname === subItem.link}>
                                        <Typography>{subItem.text}</Typography>
                                    </ListItemButton>
                                </ListItem>
                            ))}
                        </Collapse>
                    </Box>
                ))}

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
                                width: '32px'
                            }}
                        />
                        <Box
                            sx={{
                                display: 'flex',
                                overflow: 'hidden',
                                alignItems: 'center',
                                width: '100%',
                                // gap: 2,
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
                                        // opacity: 0.9,
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
                            <MenuItem variant='caption' disabled>
                                <Typography
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
    )
}

interface AppBarProps extends MuiAppBarProps {
    open?: boolean
}

export default AppDrawer
