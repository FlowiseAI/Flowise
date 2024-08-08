'use client'
import * as React from 'react'
import { usePathname } from 'next/navigation'

import { styled, alpha } from '@mui/material/styles'
import MuiDrawer from '@mui/material/Drawer'
import List from '@mui/material/List'
import Typography from '@mui/material/Typography'
import ListItem from '@mui/material/ListItem'
import ListItemButton from '@mui/material/ListItemButton'
import ListItemText from '@mui/material/ListItemText'
import ListSubheader from '@mui/material/ListSubheader'
import ListItemIcon from '@mui/material/ListItemIcon'
import WifiTetheringIcon from '@mui/icons-material/WifiTethering'
import BusinessIcon from '@mui/icons-material/Business'
import UserIcon from '@mui/icons-material/ManageAccounts'
import FolderIcon from '@mui/icons-material/Folder'

import closedMixin from './theme/closedMixin'
import openedMixin from './theme/openedMixin'
import AppSyncToolbar from './AppSyncToolbar'

import { Chat } from 'types'

const drawerWidth = 200

const DrawerHeader = styled('div')(({ theme }) => ({
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: theme.spacing(0, 1),
    // necessary for content to be below app bar
    ...theme.mixins.toolbar
}))

const Drawer = styled(MuiDrawer, { shouldForwardProp: (prop) => prop !== 'open' })(({ theme, open }) => ({
    position: 'relative',
    width: '1000px',
    flexShrink: 0,
    whiteSpace: 'nowrap',
    boxSizing: 'border-box',

    ...(open && {
        ...openedMixin({ theme, width: drawerWidth }),
        '& .MuiDrawer-paper': openedMixin({ theme, width: drawerWidth })
    }),

    ...(!open && {
        ...closedMixin({ theme }),
        '& .MuiDrawer-paper': closedMixin({ theme })
    })
}))

export interface Setting {
    id: string
    icon: any
    title: string
    link: string
}
export interface SettingsDrawerProps {
    settings?: Setting[]
    chats?: Chat[]
}

const DEFAULT_SETTINGS = [
    {
        id: 'integrations',
        link: '/settings/integrations',
        title: 'integrations',
        icon: <WifiTetheringIcon />
    },
    {
        id: 'organization-icon',
        title: 'Organization',
        link: '/settings/organization',
        icon: <BusinessIcon />
    },
    { id: 'user-icon', title: 'User', link: '/settings/user', icon: <UserIcon /> },
    { id: 'sync-icon', title: 'Documents', link: '/settings/sync-status', icon: <FolderIcon /> }
]
export default function SettingsDrawer({ settings = DEFAULT_SETTINGS, chats }: SettingsDrawerProps) {
    const currentPath = usePathname()
    const [open, setOpen] = React.useState(true)

    return (
        <>
            <DrawerHeader
                sx={{
                    position: 'absolute',
                    zIndex: 1,
                    transition: '.2s',
                    paddingTop: 8,
                    ...(open ? { opacity: 0 } : { opacity: 1, transitionDelay: '.25s' })
                }}
            ></DrawerHeader>
            <Drawer
                sx={{
                    flexShrink: 0,
                    '& .MuiDrawer-paper': {
                        background: (theme) =>
                            `linear-gradient(0deg, ${alpha(theme.palette.background.paper, 0)} 10%,  ${alpha(
                                theme.palette.background.paper,
                                1
                            )} )`,
                        borderRight: '1px solid rgba(255, 255, 255, 0.12)',
                        position: 'absolute',
                        boxSizing: 'border-box'
                    },
                    display: 'flex',
                    flexDirection: 'column',
                    height: '100%',
                    py: 2,
                    px: 2
                }}
                variant='permanent'
                anchor='left'
                open={open}
            >
                <DrawerHeader
                    sx={{
                        position: 'relative',
                        overflow: 'hidden',
                        width: '100%',
                        display: 'flex',
                        justifyContent: 'space-between',
                        transition: '.2s',
                        paddingLeft: 2,
                        paddingTop: 0,
                        ...(open ? {} : { opacity: 0 })
                    }}
                >
                    <Typography variant='body1'>
                        <strong>Settings</strong>
                    </Typography>
                </DrawerHeader>

                <List
                    disablePadding
                    sx={{ flex: 1 }}
                    subheader={
                        <ListSubheader>
                            <Typography variant='overline'>Organization</Typography>
                        </ListSubheader>
                    }
                >
                    {settings?.map((setting, idx) => (
                        <React.Fragment key={setting.link}>
                            <ListItem
                                key={setting.link}
                                disablePadding
                                sx={{
                                    flexDirection: 'column',
                                    '.MuiIconButton-root': { opacity: 1, transition: '.1s', overflow: 'hidden' },
                                    '&:not(:hover)': {
                                        '.MuiIconButton-root': {
                                            opacity: 0,
                                            px: 0,
                                            width: 0
                                        }
                                    }
                                }}
                            >
                                <ListItemButton
                                    href={`${setting.link}`}
                                    selected={currentPath?.includes(setting.link)}
                                    sx={{
                                        width: '100%',
                                        display: 'flex',
                                        gap: 2,
                                        alignItems: 'center',
                                        textTransform: 'capitalize'
                                    }}
                                >
                                    <ListItemIcon sx={{ minWidth: 24 }}>{setting.icon}</ListItemIcon>
                                    <ListItemText primary={`${setting.title}`} />
                                </ListItemButton>
                            </ListItem>
                        </React.Fragment>
                    ))}

                    <AppSyncToolbar expanded />
                </List>
            </Drawer>
        </>
    )
}
