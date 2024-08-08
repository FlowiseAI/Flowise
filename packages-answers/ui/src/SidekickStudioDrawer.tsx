'use client'
import * as React from 'react'
import NextLink from 'next/link'
import { usePathname } from 'next/navigation'

import { styled } from '@mui/material/styles'
import MuiDrawer from '@mui/material/Drawer'
import List from '@mui/material/List'
import Typography from '@mui/material/Typography'
import IconButton from '@mui/material/IconButton'
import Button from '@mui/material/Button'
import ListItem from '@mui/material/ListItem'
import ListItemButton from '@mui/material/ListItemButton'
import ListItemText from '@mui/material/ListItemText'

import Add from '@mui/icons-material/Add'
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft'
import ChevronRightIcon from '@mui/icons-material/ChevronRight'

import closedMixin from './theme/closedMixin'
import openedMixin from './theme/openedMixin'

import { Sidekick } from 'types'

const drawerWidth = 300

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
    width: drawerWidth,
    flexShrink: 0,
    whiteSpace: 'nowrap',
    boxSizing: 'border-box',

    ...(open && {
        ...openedMixin({ theme, width: drawerWidth }),
        '& .MuiDrawer-paper': openedMixin({ theme, width: drawerWidth })
    }),

    ...(!open && {
        ...closedMixin({ theme, spacing: 0 }),
        '& .MuiDrawer-paper': closedMixin({ theme, spacing: 0 })
    })
}))
export interface SidekickStudioDrawerProps {
    sidekicks?: Sidekick[]
    defaultOpen?: boolean
}

export default function SidekickStudioDrawer({ sidekicks, defaultOpen }: SidekickStudioDrawerProps) {
    const pathname = usePathname() ?? ''
    const [open, setOpen] = React.useState<boolean | undefined>(defaultOpen)
    const [opened, setOpened] = React.useState<{ [key: string | number]: boolean }>({
        sidekicks: true
    })
    const handleDrawerOpen = () => {
        window.localStorage.setItem('SidekickStudioDrawerOpen', 'true')
        setOpen(true)
    }

    const handleDrawerClose = () => {
        window.localStorage.setItem('SidekickStudioDrawerOpen', 'false')
        setOpen(false)
    }

    return (
        <>
            <DrawerHeader
                sx={{
                    position: 'absolute',
                    zIndex: 10,
                    transition: '.2s',
                    ...(open ? { opacity: 0 } : { opacity: 1, transitionDelay: '.25s' })
                }}
            >
                <IconButton onClick={open ? handleDrawerClose : handleDrawerOpen}>{!open ? <Add /> : <ChevronLeftIcon />}</IconButton>
            </DrawerHeader>
            <Drawer
                sx={{
                    flexShrink: 0,
                    position: { md: 'relative', xs: 'absolute' },
                    zIndex: 1,
                    '& .MuiDrawer-paper': {
                        position: 'absolute',
                        boxSizing: 'border-box'
                    },
                    display: 'flex',
                    flexDirection: 'column',
                    height: '100%'
                }}
                variant='permanent'
                anchor='left'
                open={open}
            >
                <DrawerHeader
                    sx={{
                        overflow: 'hidden',
                        width: '100%',
                        display: 'flex',
                        justifyContent: 'space-between',
                        transition: '.2s',
                        paddingLeft: 2,
                        position: 'sticky',
                        top: '0',
                        background: '#161616',
                        zIndex: '10',
                        ...(open ? {} : { opacity: 0 })
                    }}
                >
                    <Typography variant='h5'>
                        <NextLink href='/sidekick-studio'>Sidekicks</NextLink>
                    </Typography>
                    <IconButton onClick={open ? handleDrawerClose : handleDrawerOpen}>
                        {!open ? <ChevronRightIcon /> : <ChevronLeftIcon />}
                    </IconButton>
                </DrawerHeader>

                <ListItem sx={{ flexDirection: 'column' }} disablePadding>
                    <Button
                        href={`/sidekick-studio/new`}
                        component={NextLink}
                        sx={{ px: 2, width: '100%', textTransform: 'capitalize' }}
                        color='primary'
                    >
                        <ListItemText primary={'Create New Sidekick'} />
                        <Add />
                    </Button>
                </ListItem>

                <List disablePadding sx={{ flex: 1 }}>
                    {sidekicks?.map((sidekick, idx) => (
                        <React.Fragment key={sidekick.id}>
                            <ListItem
                                key={sidekick.id}
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
                                    href={`/sidekick-studio/${sidekick.id}/edit`}
                                    component={NextLink}
                                    selected={pathname.startsWith(`/sidekick-studio/${sidekick.id}`)}
                                    sx={{ width: '100%', py: 0, paddingRight: 1 }}
                                >
                                    <ListItemText
                                        secondary={pathname.startsWith(`/sidekick-studio/${sidekick.id}`) ? null : sidekick.label}
                                        primary={pathname.startsWith(`/sidekick-studio/${sidekick.id}`) ? sidekick.label : null}
                                    />
                                </ListItemButton>
                            </ListItem>
                        </React.Fragment>
                    ))}
                </List>
            </Drawer>
        </>
    )
}
