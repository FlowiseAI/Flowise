'use client'
import * as React from 'react'
import useSWR from 'swr'
import NextLink from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { styled } from '@mui/material/styles'
import MuiDrawer from '@mui/material/Drawer'
import List from '@mui/material/List'
import ListItem from '@mui/material/ListItem'
import ListItemButton from '@mui/material/ListItemButton'
import ListItemText from '@mui/material/ListItemText'

import closedMixin from './theme/closedMixin'
import openedMixin from './theme/openedMixin'

import { Chat, Journey } from 'types'
import { Box } from '@mui/material'

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
        const date = new Date(chat.createdAt ?? chat.createdDate)
        const now = new Date()
        if (date.toDateString() === now.toDateString()) return 'Today'
        if (date.toDateString() === new Date(now.setDate(now.getDate() - 1)).toDateString()) return 'Yesterday'
        if (date >= new Date(now.setDate(now.getDate() - 6))) return 'Last 7 days'
        if (date >= new Date(now.setDate(now.getDate() - 23))) return 'Last 30 days'
        return date.toLocaleString('default', { month: 'long', year: 'numeric' })
    }

    const chatsByDate = React.useMemo(() => {
        if (!fetchedChats) return {}
        console.log({ fetchedChats })
        const sortedChats = fetchedChats?.sort(
            (a, b) => new Date(b.createdAt ?? b.createdDate).getTime() - new Date(a.createdAt ?? a.createdDate).getTime()
        )
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
