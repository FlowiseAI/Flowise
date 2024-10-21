'use client'
import React, { useState, useEffect, useCallback, useMemo } from 'react'
import {
    Button,
    TextField,
    Box,
    Tab,
    Tabs,
    Typography,
    IconButton,
    Dialog,
    DialogContent,
    DialogTitle,
    Fade,
    Grid,
    Paper,
    Menu,
    MenuItem,
    Chip,
    Avatar,
    Tooltip
} from '@mui/material'
import {
    ExpandMore as ExpandMoreIcon,
    Search as SearchIcon,
    Star as StarIcon,
    StarBorder as StarBorderIcon,
    Add as AddIcon,
    Favorite as FavoriteIcon,
    AccessTime as AccessTimeIcon,
    MoreHoriz as MoreHorizIcon,
    Category as CategoryIcon,
    ContentCopy as ContentCopyIcon
} from '@mui/icons-material'
import { styled } from '@mui/system'
import useSWR from 'swr'
import { useRouter } from 'next/navigation'
import { useUser } from '@auth0/nextjs-auth0/client'
import marketplacesApi from '@/api/marketplaces'
import { Sidekick } from './types/sidekick'
import Fuse from 'fuse.js'
import { useAnswers } from './AnswersContext'

import { useNavigate, useNavigationState } from '@/utils/navigation'
import { IconCopy } from '@tabler/icons-react'

// Create a theme that matches shadcn/ui styling

interface SidekickSelectProps {
    onSidekickSelected: (sidekick: Sidekick) => void
    sidekicks?: Sidekick[]
    noDialog?: boolean
}

const StyledDialog = styled(Dialog)(({ theme }) => ({
    '& .MuiDialog-paper': {
        width: '90vw',
        maxWidth: '1200px',
        height: '60vh',
        maxHeight: '800px',
        backgroundColor: theme.palette.background.default
    }
}))

const ScrollableContent = styled(Box)({
    overflowY: 'auto',
    height: 'calc(100% - 120px)',
    padding: '16px'
})

const SidekickCard = styled(Paper)(({ theme, onClick }) => ({
    padding: theme.spacing(2),
    marginBottom: theme.spacing(2),
    transition: 'all 0.3s ease',
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    position: 'relative',
    ...(!onClick
        ? {}
        : {
              cursor: 'pointer',
              '&:hover': {
                  backgroundColor: theme.palette.action.hover,
                  transform: 'translateY(-2px)'
                  //   boxShadow: theme.shadows[4]
              }
          })
}))

const FavoriteButton = styled(IconButton)(({ theme }) => ({
    zIndex: 1
}))

const SidekickHeader = styled(Box)({
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '8px'
})

const SidekickTitle = styled(Typography)({
    fontWeight: 'bold',
    fontSize: '1.1rem',
    lineHeight: '1.2'
})

const SidekickDescription = styled(Typography)({
    flexGrow: 1,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    display: '-webkit-box',
    WebkitLineClamp: 2,
    WebkitBoxOrient: 'vertical'
})

const SidekickFooter = styled(Box)(({ theme }) => ({
    display: 'flex',
    justifyContent: 'flex-end',
    alignItems: 'center',
    marginTop: '8px',
    gap: theme.spacing(1)
}))

const CloneButton = styled(Button)(({ theme }) => ({
    // position: 'absolute',
    // bottom: theme.spacing(1),
    // right: theme.spacing(1),
    zIndex: 1
}))

const ContentWrapper = styled(Box)(({ theme }) => ({
    width: '100%',
    maxWidth: '1200px',
    margin: '0 auto',
    height: '90vh',
    maxHeight: '800px',
    backgroundColor: theme.palette.background.default,
    overflowY: 'auto',
    padding: theme.spacing(2),
    borderRadius: theme.shape.borderRadius
    // boxShadow: theme.shadows[5]
}))

const SidekickSelect: React.FC<SidekickSelectProps> = ({ sidekicks: defaultSidekicks = [], noDialog = false }) => {
    const { setSidekick, sidekick: selectedSidekick, setSidekick: setSelectedSidekick } = useAnswers()
    const router = useRouter()
    const { user } = useUser()

    const [searchTerm, setSearchTerm] = useState('')
    const [activeTab, setActiveTab] = useState('all')
    const [open, setOpen] = useState(false || noDialog)
    // const [selectedSidekick, setSelectedSidekick] = useState<Sidekick | null>(null)
    const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null)

    const [favorites, setFavorites] = useState<Set<string>>(new Set())

    const [fuse, setFuse] = useState<Fuse<Sidekick> | null>(null)

    const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('')

    const navigate = useNavigate()
    const [, setNavigationState] = useNavigationState()

    useEffect(() => {
        const storedFavorites = localStorage.getItem('favoriteSidekicks')
        if (storedFavorites) {
            setFavorites(new Set(JSON.parse(storedFavorites)))
        }
    }, [])

    useEffect(() => {
        const timer = setTimeout(() => setSearchTerm(debouncedSearchTerm), 300)
        return () => clearTimeout(timer)
    }, [debouncedSearchTerm])

    const toggleFavorite = useCallback((sidekick: Sidekick, event: React.MouseEvent) => {
        event.stopPropagation()
        setFavorites((prev) => {
            const newFavorites = new Set(prev)
            if (newFavorites.has(sidekick.id)) {
                newFavorites.delete(sidekick.id)
            } else {
                newFavorites.add(sidekick.id)
            }
            localStorage.setItem('favoriteSidekicks', JSON.stringify(Array.from(newFavorites)))
            return newFavorites
        })
    }, [])

    const fetcher = async (url: string) => {
        try {
            const res = await fetch(url)
            if (res.status === 401) {
                router.push('/api/auth/login?returnTo=' + encodeURIComponent(window.location.href))
            }
            return res.json()
        } catch (error) {
            console.log('error', error)
            if (error instanceof Response && error.status === 401) {
                window.location.href = '/api/auth/login?returnTo=' + encodeURIComponent(window.location.href)
            }
            return { sidekicks: [], categories: { top: [], more: [] } }
        }
    }

    const { data } = useSWR('/api/sidekicks', fetcher, {
        fallbackData: defaultSidekicks
    })

    const { data: marketplaceSidekicks = [] } = useSWR('marketplaceSidekicks', async () => {
        try {
            const { data: marketplaceChatflows } = await marketplacesApi.getAllTemplatesFromMarketplaces()
            return marketplaceChatflows?.map((chatflow: any) => ({
                id: chatflow.id,
                ...chatflow,
                chatflow: {
                    ...chatflow,
                    name: chatflow.templateName
                },
                categories: chatflow.categories,
                category: chatflow.categories,
                requiresClone: chatflow.requiresClone
            }))
        } catch (error) {
            console.error('Error fetching marketplace sidekicks:', error)
            return []
        }
    })

    const { sidekicks: allSidekicks = [], categories: chatflowCategories = { top: [], more: [] } } = data
    const combinedSidekicks = useMemo(() => [...allSidekicks, ...marketplaceSidekicks], [allSidekicks, marketplaceSidekicks])

    useEffect(() => {
        if (combinedSidekicks.length > 0) {
            const fuseOptions = {
                keys: ['chatflow.name', 'chatflow.description', 'categories'],
                threshold: 0.3,
                includeScore: true
            }
            setFuse(new Fuse(combinedSidekicks, fuseOptions))
        }
    }, [combinedSidekicks])
    const allCategories = useMemo(() => {
        const allCats = [
            ...chatflowCategories.top,
            ...chatflowCategories.more,
            ...new Set(marketplaceSidekicks.flatMap((s: Sidekick) => s.categories))
        ].filter(Boolean)
        const uniqueCats = [...new Set(allCats)]
        return {
            top: uniqueCats.slice(0, 4),
            more: uniqueCats.slice(4)
        }
    }, [chatflowCategories, marketplaceSidekicks])

    const categoryCounts = useMemo(() => {
        const counts: Record<string, number> = {
            all: combinedSidekicks.length,
            favorites: combinedSidekicks.filter((s) => favorites.has(s.id)).length,
            recent: combinedSidekicks.filter((s) => s.isRecent).length
        }
        allCategories.top.concat(allCategories.more).forEach((category) => {
            counts[category] = combinedSidekicks.filter(
                (s) => s.chatflow.category === category || s.chatflow.categories?.includes(category)
            ).length
        })
        return counts
    }, [combinedSidekicks, favorites, allCategories])

    const filteredSidekicks = useMemo(() => {
        const filterByTab = (sidekick: Sidekick) => {
            switch (activeTab) {
                case 'favorites':
                    return favorites.has(sidekick.id)
                case 'recent':
                    return sidekick.isRecent
                case 'all':
                    return true
                default:
                    return sidekick.chatflow.categories?.includes(activeTab) || sidekick.chatflow.category === activeTab
            }
        }

        let filtered = combinedSidekicks

        if (searchTerm && fuse) {
            filtered = fuse.search(searchTerm).map((result) => result.item)
        }

        filtered = filtered.filter(filterByTab)

        return filtered
    }, [combinedSidekicks, searchTerm, activeTab, favorites, fuse])

    const handleSidekickSelect = (sidekick: Sidekick) => {
        setSelectedSidekick(sidekick)
        setSidekick(sidekick)
        setOpen(false)

        const sidekickHistory = JSON.parse(localStorage.getItem('sidekickHistory') || '{}')
        sidekickHistory.lastUsed = sidekick
        localStorage.setItem('sidekickHistory', JSON.stringify(sidekickHistory))
    }

    const handleMoreClick = (event: React.MouseEvent<HTMLButtonElement>) => {
        event.preventDefault()
        event.stopPropagation()
        setAnchorEl(event.currentTarget)
    }

    const handleMoreClose = () => {
        setAnchorEl(null)
    }

    const handleCategorySelect = (category: string) => {
        setActiveTab(category)
        handleMoreClose()
    }

    const visibleTabs = useMemo(() => {
        const topTabs = allCategories.top
        if (!topTabs.includes(activeTab) && allCategories.more.includes(activeTab)) {
            return [...topTabs, activeTab]
        }
        return topTabs
    }, [allCategories, activeTab])

    const handleClone = (sidekick: Sidekick, e: React.MouseEvent) => {
        e.stopPropagation()

        if (!sidekick) return

        const isAgentCanvas = (sidekick.flowData?.nodes || []).some(
            (node) => node.data.category === 'Multi Agents' || node.data.category === 'Sequential Agents'
        )

        localStorage.setItem('duplicatedFlowData', JSON.stringify(sidekick.chatflow))
        const state = {
            templateData: JSON.stringify(sidekick),
            parentChatflowId: sidekick.id
        }
        if (!user) {
            const redirectUrl = `/sidekick-studio/${isAgentCanvas ? 'agentcanvas' : 'canvas'}`
            const loginUrl = `/api/auth/login?returnTo=${redirectUrl}`
            setNavigationState(state)
            window.location.href = loginUrl
        } else {
            navigate(`/${isAgentCanvas ? 'agentcanvas' : 'canvas'}`, {
                state
            })
        }
    }

    const content = (
        <>
            <Box sx={{ pb: 2 }}>
                <TextField
                    key={'search-term-input'}
                    fullWidth
                    variant='outlined'
                    placeholder='"Create an image of..." or "Write a poem about..." or "Generate a report for...")'
                    onChange={(e) => setDebouncedSearchTerm(e.target.value)}
                    InputProps={{
                        startAdornment: <SearchIcon color='action' />
                    }}
                />
            </Box>
            <Box>
                <Tabs
                    value={activeTab}
                    onChange={(event, newValue) => {
                        if (newValue !== null) {
                            setActiveTab(newValue)
                        }
                    }}
                    variant='scrollable'
                    scrollButtons='auto'
                    sx={{ mb: 2, borderBottom: 1, borderColor: 'divider' }}
                >
                    <Tab label='All' value='all' disabled={categoryCounts.all === 0} />
                    <Tab
                        label='Favorites'
                        icon={<FavoriteIcon />}
                        iconPosition='start'
                        value='favorites'
                        disabled={categoryCounts.favorites === 0}
                    />
                    <Tab
                        label='Recent'
                        icon={<AccessTimeIcon />}
                        iconPosition='start'
                        value='recent'
                        disabled={categoryCounts.recent === 0}
                    />
                    {visibleTabs.map((category: string) => (
                        <Tab key={category} label={category} value={category} disabled={categoryCounts[category] === 0} />
                    ))}
                    {allCategories.more.length > 0 && (
                        <Tab
                            icon={<MoreHorizIcon />}
                            iconPosition='start'
                            onClick={handleMoreClick}
                            sx={{ minWidth: 'auto' }}
                            disabled={allCategories.more.every((category) => categoryCounts[category] === 0)}
                            value={null}
                        />
                    )}
                </Tabs>
                <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={handleMoreClose}>
                    {allCategories.more.map((category: string) => (
                        <MenuItem key={category} onClick={() => handleCategorySelect(category)} disabled={categoryCounts[category] === 0}>
                            {category}
                        </MenuItem>
                    ))}
                </Menu>
                <ScrollableContent key={`scrollable-content-${activeTab}-${searchTerm}`}>
                    <Grid container spacing={2}>
                        {filteredSidekicks.map((sidekick) => (
                            <Grid item xs={12} sm={6} md={4}>
                                <SidekickCard onClick={!sidekick.isExecutable ? undefined : () => handleSidekickSelect(sidekick)}>
                                    <SidekickHeader sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                                        <SidekickTitle variant='h6' sx={{ width: '100%' }}>
                                            {sidekick.chatflow.name}
                                        </SidekickTitle>
                                        <Box sx={{ display: 'flex', flexWrap: 'wrap', width: '100%', gap: 1 }}>
                                            {sidekick.categories?.length > 0 && sidekick.categories?.map ? (
                                                <Tooltip title={sidekick.categories.join(', ')}>
                                                    <Chip
                                                        // icon={<CategoryIcon />}
                                                        label={sidekick.categories
                                                            .map((category: string, index: number) => category.trim())
                                                            .join(' | ')}
                                                        size='small'
                                                        variant='outlined'
                                                        sx={{ marginRight: 0.5 }}
                                                    />
                                                </Tooltip>
                                            ) : // <Chip icon={<CategoryIcon />} label='Uncategorized' size='small' variant='outlined' />
                                            null}
                                            {sidekick.chatflow.isOwner && (
                                                <Chip label='Owner' size='small' color='primary' variant='outlined' />
                                            )}
                                        </Box>
                                    </SidekickHeader>
                                    <SidekickDescription variant='body2' color='text.secondary'>
                                        {sidekick.chatflow.description || 'No description available'}
                                    </SidekickDescription>
                                    <SidekickFooter>
                                        {sidekick.isExecutable && (
                                            <FavoriteButton onClick={(e) => toggleFavorite(sidekick, e)} color='primary' size='small'>
                                                {favorites.has(sidekick.id) ? <StarIcon /> : <StarBorderIcon />}
                                            </FavoriteButton>
                                        )}
                                        <CloneButton
                                            variant='outlined'
                                            size='small'
                                            startIcon={<IconCopy />}
                                            onClick={(e) => handleClone(sidekick, e)}
                                        >
                                            Clone
                                        </CloneButton>
                                    </SidekickFooter>
                                </SidekickCard>
                            </Grid>
                        ))}
                    </Grid>
                </ScrollableContent>
            </Box>
        </>
    )

    if (noDialog) {
        return <ContentWrapper>{content}</ContentWrapper>
    }

    return (
        <Box>
            <Button
                variant='outlined'
                onClick={() => setOpen(true)}
                endIcon={<ExpandMoreIcon />}
                sx={{ width: 200, justifyContent: 'space-between' }}
            >
                {selectedSidekick ? selectedSidekick.chatflow.name : 'Select Sidekick'}
            </Button>
            <StyledDialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth='lg' TransitionComponent={Fade}>
                <DialogTitle sx={{ pb: 0 }}>Select a Sidekick</DialogTitle>
                <DialogContent>{content}</DialogContent>
            </StyledDialog>
        </Box>
    )
}

export default SidekickSelect
