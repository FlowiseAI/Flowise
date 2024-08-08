'use client'
import * as React from 'react'
import useSWR from 'swr'
import NextLink from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { styled, Theme, CSSObject } from '@mui/material/styles'
import MuiDrawer from '@mui/material/Drawer'
import List from '@mui/material/List'
import IconButton from '@mui/material/IconButton'
import ListItem from '@mui/material/ListItem'
import ListItemButton from '@mui/material/ListItemButton'
import ListItemText from '@mui/material/ListItemText'

import Add from '@mui/icons-material/Add'
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft'
import ChevronRightIcon from '@mui/icons-material/ChevronRight'

import closedMixin from './theme/closedMixin'
import openedMixin from './theme/openedMixin'

import { Chat, Journey } from 'types'
import { Box, Button } from '@mui/material'

const drawerWidth = 400

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
    width: '100%',
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
export interface ChatDrawerProps {
    journeys?: Journey[]
    chats?: Chat[]
    defaultOpen?: boolean
}

const fetcher = (url: string) => fetch(url).then((res) => res.json())

export default function ChatDrawer({ journeys, chats, defaultOpen }: ChatDrawerProps) {
    const router = useRouter()
    const pathname = usePathname()
    const [open, setOpen] = React.useState<boolean | undefined>(defaultOpen)
    const [opened, setOpened] = React.useState<{ [key: string | number]: boolean }>({ chats: true })

    const { data: fetchedChats } = useSWR<Chat[]>('/api/chats', fetcher, { fallback: chats })
    const getDateKey = (chat: Chat) => {
        const date = new Date(chat.createdAt)
        const now = new Date()
        if (date.toDateString() === now.toDateString()) return 'Today'
        if (date.toDateString() === new Date(now.setDate(now.getDate() - 1)).toDateString()) return 'Yesterday'
        if (date >= new Date(now.setDate(now.getDate() - 6))) return 'Last 7 days'
        if (date >= new Date(now.setDate(now.getDate() - 23))) return 'Last 30 days'
        return date.toLocaleString('default', { month: 'long', year: 'numeric' })
    }

    const chatsByDate = React.useMemo(() => {
        const sortedChats = fetchedChats?.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        return sortedChats?.reduce((accum: { [key: string]: Chat[] }, chat: Chat) => {
            const dateKey = getDateKey(chat)
            return { ...accum, [dateKey]: [...(accum[dateKey] || []), chat] }
        }, {})
    }, [fetchedChats])

    const handleDrawerOpen = () => {
        window.localStorage.setItem('drawerOpen', 'true')
        setOpen(true)
    }

    const handleDrawerClose = () => {
        window.localStorage.setItem('drawerOpen', 'false')
        setOpen(false)
    }

    const handleExpandJourney = (idx: string | number) => (evt: any) => {
        evt.preventDefault()
        evt.stopPropagation()
        setOpened((prev) => {
            const newArr = { ...prev }
            newArr[idx] = !newArr[idx]
            return newArr
        })
    }

    const handleAddChat = ({ journey }: any) => {
        setOpen(false)
        router.push('/chat')
    }

    return (
        <>
            <List disablePadding>
                <ListItem
                    disablePadding
                    sx={(theme) => ({
                        flexDirection: 'row',
                        px: 0,
                        py: 1,
                        position: 'sticky',
                        top: 0,
                        zIndex: 2,
                        bgcolor: 'background.paper'
                    })}
                >
                    <Button
                        href={`/chat`}
                        variant='outlined'
                        onClick={handleDrawerClose}
                        component={NextLink}
                        endIcon={<Add />}
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
                                    // display: 'none'
                                }
                            }}
                        >
                            New chat
                        </Box>
                    </Button>
                </ListItem>
                {Object.entries(chatsByDate || {}).map(([date, chats]) => (
                    <Box key={date} sx={{ mb: 1 }}>
                        <ListItem
                            sx={{
                                px: 1,
                                transition: '.2s',
                                '.MuiDrawer-closed &': {
                                    opacity: 0
                                }
                            }}
                            disablePadding
                        >
                            <ListItemText primary={date} primaryTypographyProps={{ variant: 'caption' }} />
                        </ListItem>
                        {chats.map((chat) => (
                            <ListItem
                                key={chat.id}
                                disablePadding
                                sx={{
                                    transition: '.2s',
                                    '.MuiDrawer-closed &': {
                                        opacity: 0
                                    }
                                }}
                            >
                                <ListItemButton selected={pathname === `/chat/${chat.id}`} href={`/chat/${chat.id}`} component={NextLink}>
                                    <ListItemText
                                        secondary={chat.title}
                                        sx={pathname === `/chat/${chat.id}` ? { '.MuiListItemText-secondary': { color: 'white' } } : {}}
                                    />
                                </ListItemButton>
                            </ListItem>
                        ))}
                    </Box>
                ))}
            </List>
        </>
    )
}
