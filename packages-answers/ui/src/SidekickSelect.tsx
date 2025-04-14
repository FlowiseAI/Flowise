'use client'
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react'
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
    Tooltip,
    Divider,
    Snackbar
} from '@mui/material'
import {
    ExpandMore as ExpandMoreIcon,
    Search as SearchIcon,
    Star as StarIcon,
    StarBorder as StarBorderIcon,
    Favorite as FavoriteIcon,
    AccessTime as AccessTimeIcon,
    MoreHoriz as MoreHorizIcon,
    Visibility as VisibilityIcon,
    Edit as EditIcon,
    Cancel as CancelIcon
} from '@mui/icons-material'
import { styled } from '@mui/system'
import useSWR from 'swr'
import { useUser } from '@auth0/nextjs-auth0/client'
import marketplacesApi from '@/api/marketplaces'
import { Sidekick } from './types/sidekick'
import Fuse from 'fuse.js'
import { useAnswers } from './AnswersContext'

import { useNavigate, useNavigationState } from '@/utils/navigation'
import { IconCopy } from '@tabler/icons-react'
import { useTheme } from '@mui/material/styles'
import useScrollTrigger from '@mui/material/useScrollTrigger'
import { alpha } from '@mui/material/styles'
import dynamic from 'next/dynamic'
import { debounce } from '@utils/debounce'
const MarketplaceLandingDialog = dynamic(() => import('@/views/chatflows/MarketplaceLandingDialog'), { ssr: false })

// Create a theme that matches shadcn/ui styling

interface SidekickSelectProps {
    onSidekickSelected?: (sidekick: Sidekick) => void
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
    paddingTop: '16px',
    paddingBottom: '16px'
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
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    display: '-webkit-box',
    WebkitLineClamp: 2,
    WebkitBoxOrient: 'vertical',
    minHeight: '2.5em'
})

const SidekickFooter = styled(Box)(({ theme }) => ({
    display: 'flex',
    justifyContent: 'flex-end',
    alignItems: 'center',
    marginTop: '8px',
    gap: theme.spacing(1),
    '& .MuiSvgIcon-root': {
        color: theme.palette.common.white
    },
    '& .MuiButton-contained': {
        backgroundColor: alpha(theme.palette.primary.main, 0.7),
        color: theme.palette.common.white,
        '&:hover': {
            backgroundColor: theme.palette.primary.main
        }
    }
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

const WhiteButton = styled(Button)(({ theme }) => ({
    color: theme.palette.common.white,
    borderColor: theme.palette.common.white,
    '&:hover': {
        backgroundColor: alpha(theme.palette.primary.main, 0.08),
        borderColor: theme.palette.primary.main,
        color: theme.palette.primary.main
    }
}))

const WhiteIconButton = styled(IconButton)(({ theme }) => ({
    color: theme.palette.common.white,
    '&:hover': {
        backgroundColor: alpha(theme.palette.primary.main, 0.08),
        color: theme.palette.primary.main
    }
}))

const SidekickSelect: React.FC<SidekickSelectProps> = ({ sidekicks: defaultSidekicks = [], noDialog = false }) => {
    const { chat, setSidekick, sidekick: selectedSidekick, setSidekick: setSelectedSidekick } = useAnswers()
    const { user } = useUser()
    const searchbarRef = useRef<HTMLInputElement>(null)

    const [searchInputValue, setSearchInputValue] = useState('')
    const [activeTab, setActiveTab] = useState<string>('all')
    const [previousActiveTab, setPreviousActiveTab] = useState<string>('all')
    const [open, setOpen] = useState(false || noDialog)
    const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null)

    const [favorites, setFavorites] = useState<Set<string>>(new Set())

    const [fuse, setFuse] = useState<Fuse<Sidekick> | null>(null)

    const navigate = useNavigate()
    const [, setNavigationState] = useNavigationState()

    const theme = useTheme()
    const trigger = useScrollTrigger({
        disableHysteresis: true,
        threshold: 100
    })

    const OrgSidekicksHeader = styled(Box)(({ theme }) => ({
        position: 'sticky',
        top: 0,
        // backgroundColor: theme.palette.background.default,
        zIndex: 1,
        padding: theme.spacing(1, 0),
        transition: theme.transitions && theme.transitions.create ? theme.transitions.create(['box-shadow']) : 'box-shadow 0.3s ease',
        ...(trigger && {
            boxShadow: `0 1px 0 ${theme.palette.divider}`
        })
    }))

    const [tabValue, setTabValue] = useState<string>('favorites')

    const [isMarketplaceDialogOpen, setIsMarketplaceDialogOpen] = useState(false)
    const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null)

    const [showCopyMessage, setShowCopyMessage] = useState(false)

    // Replace multiple state variables and optimize debouncing
    const [searchTerm, setSearchTerm] = useState('')
    const debouncedSetSearchTerm = useCallback(
        debounce((value: string) => {
            setSearchTerm(value)
            if (value) {
                setPreviousActiveTab(tabValue)
                setTabValue('search')
            }
        }, 600),
        [tabValue]
    )

    useEffect(() => {
        const storedFavorites = localStorage.getItem('favoriteSidekicks')
        if (storedFavorites) {
            try {
                const parsedFavorites = new Set(JSON.parse(storedFavorites) as string[])
                setFavorites(parsedFavorites)

                if (parsedFavorites.size === 0) {
                    setTabValue('all')
                }
            } catch (e) {
                console.error('Error parsing favorites:', e)
                setTabValue('all')
            }
        } else {
            setTabValue('all')
        }
    }, [])

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
                // window.location.href = '/api/auth/login?redirect_uri=' + encodeURIComponent(window.location.href)
                window.location.href = '/api/auth/login?redirect_uri=' + encodeURIComponent(window.location.href)
            } else {
                return res.json()
            }
        } catch (error) {
            console.log('error', error)
            if (error instanceof Response && error.status === 401) {
                window.location.href = '/api/auth/login?redirect_uri=' + encodeURIComponent(window.location.href)
                // window.location.href = '/api/auth/login?redirect_uri=' + encodeURIComponent(window.location.href)
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

    // Optimize the combined sidekicks calculation
    const combinedSidekicks = useMemo(() => {
        const sidekickMap = new Map<string, Sidekick>()

        // First, add all sidekicks from allSidekicks
        allSidekicks.forEach((sidekick: any) => {
            sidekickMap.set(sidekick.id, sidekick)
        })

        // Then, add or update with marketplace sidekicks, prioritizing executable ones
        marketplaceSidekicks.forEach((sidekick: any) => {
            const existingSidekick = sidekickMap.get(sidekick.id)
            if (!existingSidekick || (!existingSidekick.isExecutable && sidekick.isExecutable)) {
                sidekickMap.set(sidekick.id, sidekick)
            }
        })

        return Array.from(sidekickMap.values())
    }, [allSidekicks, marketplaceSidekicks])

    // Optimize Fuse.js initialization - only create when combinedSidekicks changes
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
        const uniqueCats = [...new Set(allCats)].sort((a, b) => a.localeCompare(b))
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
                (s) => s.chatflow.category === category || s.chatflow.categories?.includes(category) || s.categories?.includes(category)
            ).length
        })
        return counts
    }, [combinedSidekicks, favorites, allCategories])

    // Consolidated filtering and sorting for performance
    const { userSidekicks, orgSidekicks } = useMemo(() => {
        // Filter function based on active tab
        const matchesTab = (sidekick: Sidekick) => {
            switch (tabValue) {
                case 'favorites':
                    return favorites.has(sidekick.id)
                case 'recent':
                    return sidekick.isRecent
                case 'all':
                    return true
                case 'search':
                    return true
                default:
                    return (
                        sidekick.chatflow.categories?.includes(tabValue) ||
                        sidekick.chatflow.category === tabValue ||
                        sidekick.categories?.includes(tabValue)
                    )
            }
        }

        // Get initial filtered list based on search or tab
        let filtered: Sidekick[]
        if (searchTerm && fuse) {
            filtered = fuse
                .search(searchTerm)
                .map((result) => result.item)
                .filter(matchesTab)
        } else {
            filtered = combinedSidekicks.filter(matchesTab)
        }

        // Sort function to prioritize executable sidekicks
        const sortFn = (a: Sidekick, b: Sidekick) => {
            // First sort by executable status
            if (a.isExecutable !== b.isExecutable) return a.isExecutable ? -1 : 1
            // Then sort alphabetically
            return a.chatflow.name.localeCompare(b.chatflow.name)
        }

        // Separate user and org sidekicks in a single pass
        const userSidekicks: Sidekick[] = []
        const orgSidekicks: Sidekick[] = []

        filtered.forEach((sidekick) => {
            if (sidekick.chatflow.isOwner) userSidekicks.push(sidekick)
            else orgSidekicks.push(sidekick)
        })

        // Sort both arrays
        userSidekicks.sort(sortFn)
        orgSidekicks.sort(sortFn)

        return { userSidekicks, orgSidekicks }
    }, [combinedSidekicks, searchTerm, tabValue, favorites, fuse])

    const handleSidekickSelect = (sidekick: Sidekick) => {
        if (!chat?.id) {
            // Update local storage first
            const sidekickHistory = JSON.parse(localStorage.getItem('sidekickHistory') || '{}')
            sidekickHistory.lastUsed = sidekick
            localStorage.setItem('sidekickHistory', JSON.stringify(sidekickHistory))

            // Update URL without navigation using history API
            const newUrl = `/chat/${sidekick.id}`
            window.history.pushState({ sidekick, isClientNavigation: true }, '', newUrl)

            // Directly initialize the chat with the sidekick data
            setSelectedSidekick(sidekick)
            setSidekick(sidekick)
        } else {
            setSelectedSidekick(sidekick)
            setSidekick(sidekick)
            setOpen(false)
            setIsMarketplaceDialogOpen(false)
            const sidekickHistory = JSON.parse(localStorage.getItem('sidekickHistory') || '{}')
            sidekickHistory.lastUsed = sidekick
            localStorage.setItem('sidekickHistory', JSON.stringify(sidekickHistory))
        }
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
        const topTabs = allCategories.top?.map((category) => category.split(';').join(' | '))
        if (!topTabs.includes(activeTab) && allCategories.more.includes(activeTab)) {
            return [...topTabs, activeTab]
        }
        return topTabs
    }, [allCategories, activeTab])

    const handleClone = useCallback(
        (sidekick: Sidekick, e: React.MouseEvent) => {
            e.stopPropagation()

            if (!sidekick) return

            const isAgentCanvas = (sidekick.flowData?.nodes || []).some(
                (node: { data: { category: string } }) =>
                    node.data.category === 'Multi Agents' || node.data.category === 'Sequential Agents'
            )

            localStorage.setItem('duplicatedFlowData', JSON.stringify(sidekick.chatflow))
            const state = {
                templateData: JSON.stringify(sidekick),
                parentChatflowId: sidekick.id
            }
            if (!user) {
                const redirectUrl = `/sidekick-studio/${isAgentCanvas ? 'agentcanvas' : 'canvas'}`
                const loginUrl = `/api/auth/login?redirect_uri=${redirectUrl}`
                setNavigationState(state)
                window.location.href = loginUrl
            } else {
                navigate(`/${isAgentCanvas ? 'agentcanvas' : 'canvas'}`, {
                    state
                })
            }
        },
        [navigate, user, setNavigationState]
    )

    const handleEdit = useCallback((sidekick: Sidekick, e: React.MouseEvent) => {
        e.stopPropagation()

        if (!sidekick) return

        const isAgentCanvas = (sidekick.flowData?.nodes || []).some(
            (node: { data: { category: string } }) => node.data.category === 'Multi Agents' || node.data.category === 'Sequential Agents'
        )

        const url = `/sidekick-studio/${isAgentCanvas ? 'agentcanvas' : 'canvas'}/${sidekick.id}`
        window.open(url, '_blank')
    }, [])

    const handleCardClick = (sidekick: Sidekick) => {
        handleSidekickSelect(sidekick)
    }

    const handlePreviewClick = (sidekick: Sidekick, e: React.MouseEvent) => {
        e.stopPropagation()
        setSelectedTemplateId(sidekick.id)
        setIsMarketplaceDialogOpen(true)
    }

    const clearSearchField = () => {
        setSearchInputValue('')
        setSearchTerm('')
        setTabValue(previousActiveTab)
    }

    // Optimize rendering by using the pre-computed filtered sidekicks
    const renderSidekickGrid = useCallback(() => {
        const renderSidekicks = (sidekicks: Sidekick[]) => (
            <Grid container spacing={2}>
                {sidekicks.map((sidekick) => (
                    <Grid item xs={12} sm={6} md={6} key={`${tabValue}-${sidekick.id}-${sidekick.chatflow.name}`}>
                        <Box sx={{ position: 'relative' }}>
                            <SidekickCard
                                onClick={sidekick.isExecutable ? () => handleCardClick(sidekick) : undefined}
                                sx={{
                                    position: 'relative',
                                    transition: 'all 0.3s ease',
                                    ...(!sidekick.isExecutable && {
                                        // pointerEvents: 'none',
                                        cursor: 'not-allowed',
                                        '& .actionButtons': {
                                            position: 'relative',
                                            zIndex: 2,
                                            pointerEvents: 'auto'
                                        },
                                        backgroundColor: `${theme.palette.background.paper}!important`,
                                        backdropFilter: 'blur(10px)',
                                        border: `1px solid ${alpha(theme.palette.common.white, 0.1)}`,
                                        overflow: 'hidden',
                                        '&::before': {
                                            content: '"MARKETPLACE"',
                                            position: 'absolute',
                                            top: 0,
                                            right: theme.spacing(2),
                                            fontSize: '0.65rem',
                                            color: alpha(theme.palette.primary.main, 0.8),
                                            letterSpacing: '1px',
                                            fontWeight: 500,
                                            background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.1)} 0%, ${alpha(
                                                theme.palette.primary.main,
                                                0.2
                                            )} 100%)`,
                                            padding: '4px 8px',
                                            borderBottomLeftRadius: theme.shape.borderRadius,
                                            borderBottomRightRadius: theme.shape.borderRadius,
                                            backdropFilter: 'blur(8px)',
                                            zIndex: 1
                                        },
                                        '&:hover': {
                                            transform: 'none',
                                            boxShadow: 'none'
                                        }
                                    })
                                }}
                            >
                                <SidekickHeader sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                                    <Box sx={{ display: 'flex', alignItems: 'center', width: '100%', justifyContent: 'space-between' }}>
                                        <SidekickTitle variant='h6'>{sidekick.chatflow.name}</SidekickTitle>
                                    </Box>
                                    <Box sx={{ display: 'flex', flexWrap: 'wrap', width: '100%', gap: 1 }}>
                                        {sidekick.categories?.length > 0 && sidekick.categories?.map ? (
                                            <Tooltip
                                                title={sidekick.categories
                                                    .map((category: string) => category.trim().split(';').join(', '))
                                                    .join(', ')}
                                            >
                                                <Chip
                                                    label={sidekick.categories
                                                        .map((category: string) => category.trim().split(';').join(' | '))
                                                        .join(' | ')}
                                                    size='small'
                                                    variant='outlined'
                                                    sx={{ marginRight: 0.5 }}
                                                />
                                            </Tooltip>
                                        ) : null}
                                        {sidekick.chatflow.isOwner && (
                                            <Chip label='Owner' size='small' color='primary' variant='outlined' />
                                        )}
                                    </Box>
                                </SidekickHeader>
                                <SidekickDescription variant='body2' color='text.secondary'>
                                    {sidekick.chatflow.description || 'No description available'}
                                </SidekickDescription>
                                <SidekickFooter className='actionButtons'>
                                    {sidekick.chatflow.isOwner ? (
                                        <>
                                            <Tooltip title='Edit this sidekick'>
                                                <WhiteIconButton size='small' onClick={(e) => handleEdit(sidekick, e)}>
                                                    <EditIcon />
                                                </WhiteIconButton>
                                            </Tooltip>
                                        </>
                                    ) : null}
                                    {sidekick.isExecutable ? (
                                        <Tooltip title='Clone this sidekick'>
                                            <WhiteIconButton size='small' onClick={(e) => handleClone(sidekick, e)}>
                                                <IconCopy />
                                            </WhiteIconButton>
                                        </Tooltip>
                                    ) : (
                                        <Tooltip title='Clone this sidekick'>
                                            <WhiteButton
                                                variant='outlined'
                                                endIcon={<IconCopy />}
                                                onClick={(e) => handleClone(sidekick, e)}
                                            >
                                                Clone
                                            </WhiteButton>
                                        </Tooltip>
                                    )}
                                    <Tooltip
                                        title={
                                            !sidekick.isExecutable
                                                ? 'Clone this sidekick to use it'
                                                : favorites.has(sidekick.id)
                                                ? 'Remove from favorites'
                                                : 'Add to favorites'
                                        }
                                    >
                                        <span>
                                            <WhiteIconButton
                                                onClick={(e) => toggleFavorite(sidekick, e)}
                                                size='small'
                                                disabled={!sidekick.isExecutable && !favorites.has(sidekick.id)}
                                            >
                                                {favorites.has(sidekick.id) ? <StarIcon /> : <StarBorderIcon />}
                                            </WhiteIconButton>
                                        </span>
                                    </Tooltip>

                                    <Tooltip title='Preview this sidekick'>
                                        <span>
                                            <WhiteIconButton onClick={(e) => handlePreviewClick(sidekick, e)} size='small'>
                                                <VisibilityIcon />
                                            </WhiteIconButton>
                                        </span>
                                    </Tooltip>
                                    {sidekick.isExecutable && (
                                        <Tooltip title='Use this sidekick'>
                                            <Button variant='contained' size='small' onClick={() => handleSidekickSelect(sidekick)}>
                                                Use
                                            </Button>
                                        </Tooltip>
                                    )}
                                </SidekickFooter>
                            </SidekickCard>
                        </Box>
                    </Grid>
                ))}
            </Grid>
        )

        return (
            <>
                {userSidekicks.length > 0 && renderSidekicks(userSidekicks)}
                {orgSidekicks.length > 0 && (
                    <>
                        {userSidekicks.length > 0 && (
                            <OrgSidekicksHeader>
                                <Divider sx={{ my: 2 }} />
                            </OrgSidekicksHeader>
                        )}
                        {renderSidekicks(orgSidekicks)}
                    </>
                )}
            </>
        )
    }, [userSidekicks, orgSidekicks, tabValue, favorites, handleSidekickSelect, handleClone, toggleFavorite, handleEdit, theme])

    const content = (
        <>
            <Box sx={{ pb: 2, display: 'flex', gap: 1 }}>
                <TextField
                    ref={searchbarRef}
                    key={'search-term-input'}
                    fullWidth
                    variant='outlined'
                    style={{ position: 'relative' }}
                    placeholder='"Create an image of..." or "Write a poem about..." or "Generate a report for...")'
                    // value={searchInputValue}
                    onChange={(e) => {
                        const value = e.target.value
                        setSearchInputValue(value)
                        debouncedSetSearchTerm(value)
                    }}
                    InputProps={{
                        startAdornment: <SearchIcon color='action' />,
                        endAdornment: searchInputValue.length > 0 && (
                            <Button onClick={clearSearchField} style={{ position: 'absolute', right: 10, padding: 0, minWidth: 'auto' }}>
                                <CancelIcon color='action' />
                            </Button>
                        )
                    }}
                />
            </Box>
            <Box>
                <Tabs
                    value={tabValue}
                    onChange={(event, newValue) => {
                        if (newValue !== null) {
                            setTabValue(newValue)
                        }
                        if (newValue === 'search') {
                            setPreviousActiveTab(tabValue)
                        }
                    }}
                    variant='scrollable'
                    scrollButtons='auto'
                    sx={{ mb: 2, borderBottom: 1, borderColor: 'divider' }}
                >
                    <Tab label='Search' value='search' icon={<SearchIcon />} iconPosition='start' disabled={categoryCounts.all === 0} />
                    <Tab
                        label='Favorites'
                        icon={<FavoriteIcon />}
                        iconPosition='start'
                        value='favorites'
                        disabled={categoryCounts.favorites === 0}
                    />
                    <Tab label='All' value='all' disabled={categoryCounts.all === 0} />
                    {/* <Tab
                        label='Recent'
                        icon={<AccessTimeIcon />}
                        iconPosition='start'
                        value='recent'
                        disabled={categoryCounts.recent === 0}
                    /> */}
                    {visibleTabs.map((category: string) => (
                        <Tab
                            key={`${category}-tab`}
                            label={category}
                            value={category}
                            disabled={categoryCounts[category] === 0}
                            style={{
                                textWrap: 'nowrap',
                                maxWidth: 'fit-content',
                                display: 'inline-block'
                            }}
                        />
                    ))}
                    {allCategories.more.length > 0 && (
                        <Tab
                            icon={<MoreHorizIcon />}
                            iconPosition='start'
                            onClick={handleMoreClick}
                            sx={{ minWidth: 'auto' }}
                            disabled={allCategories.more.every((category) => categoryCounts[category] === 0)}
                            value={null}
                            component='button'
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
                <ScrollableContent>{renderSidekickGrid()}</ScrollableContent>
            </Box>
            <MarketplaceLandingDialog
                key='marketplace-dialog'
                open={isMarketplaceDialogOpen}
                onClose={() => {
                    setIsMarketplaceDialogOpen(false)
                    setSelectedTemplateId(null)
                    // Remove the templateId from the URL when closing the dialog
                    window.history.pushState(null, '', window.location.pathname)
                }}
                templateId={selectedTemplateId}
                onUse={(sidekick) => handleSidekickSelect(sidekick)}
            />
        </>
    )

    const handleCreateNewSidekick = () => {
        navigate('/canvas')
    }

    if (noDialog) {
        return <ContentWrapper>{content}</ContentWrapper>
    }
    return (
        <Box>
            <Button variant='outlined' onClick={() => setOpen(true)} endIcon={<ExpandMoreIcon />} sx={{ justifyContent: 'space-between' }}>
                {selectedSidekick && 'chatflow' in selectedSidekick ? selectedSidekick.chatflow.name : 'Select Sidekick'}
            </Button>
            <StyledDialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth='lg' TransitionComponent={Fade}>
                <DialogTitle sx={{ pb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    Select a Sidekick
                    <Button variant='contained' color='primary' onClick={handleCreateNewSidekick}>
                        Create
                    </Button>
                </DialogTitle>
                <DialogContent>
                    <Box sx={{ pb: 2 }}>
                        <TextField
                            key={'search-term-input'}
                            fullWidth
                            variant='outlined'
                            placeholder='"Create an image of..." or "Write a poem about..." or "Generate a report for...")'
                            value={searchInputValue}
                            onChange={(e) => {
                                const value = e.target.value
                                setSearchInputValue(value)
                                debouncedSetSearchTerm(value)
                            }}
                            InputProps={{
                                startAdornment: <SearchIcon color='action' />,
                                endAdornment: searchInputValue.length > 0 && (
                                    <Button
                                        onClick={clearSearchField}
                                        style={{ position: 'absolute', right: 10, padding: 0, minWidth: 'auto' }}
                                    >
                                        <CancelIcon color='action' />
                                    </Button>
                                )
                            }}
                        />
                    </Box>
                    <Box>
                        <Tabs
                            value={tabValue}
                            onChange={(event, newValue) => {
                                if (newValue !== null) {
                                    setTabValue(newValue)
                                }
                            }}
                            variant='scrollable'
                            scrollButtons='auto'
                            sx={{ mb: 2, borderBottom: 1, borderColor: 'divider' }}
                        >
                            <Tab
                                label='Favorites'
                                icon={<FavoriteIcon />}
                                iconPosition='start'
                                value='favorites'
                                disabled={categoryCounts.favorites === 0}
                            />
                            <Tab label='All' value='all' disabled={categoryCounts.all === 0} />
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
                                    component='button'
                                />
                            )}
                        </Tabs>
                        <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={handleMoreClose}>
                            {allCategories.more.map((category: string) => (
                                <MenuItem
                                    key={category}
                                    onClick={() => handleCategorySelect(category)}
                                    disabled={categoryCounts[category] === 0}
                                >
                                    {category}
                                </MenuItem>
                            ))}
                        </Menu>
                        <ScrollableContent>{renderSidekickGrid()}</ScrollableContent>
                    </Box>
                </DialogContent>
            </StyledDialog>
            <MarketplaceLandingDialog
                key='marketplace-dialog'
                open={isMarketplaceDialogOpen}
                onClose={() => {
                    setIsMarketplaceDialogOpen(false)
                    setSelectedTemplateId(null)
                    // Remove the templateId from the URL when closing the dialog
                    window.history.pushState(null, '', window.location.pathname)
                }}
                templateId={selectedTemplateId}
                onUse={(sidekick) => handleSidekickSelect(sidekick)}
            />
            <Snackbar
                open={showCopyMessage}
                autoHideDuration={2000}
                onClose={() => setShowCopyMessage(false)}
                message='Link copied to clipboard'
                anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
            />
        </Box>
    )
}

export default SidekickSelect
