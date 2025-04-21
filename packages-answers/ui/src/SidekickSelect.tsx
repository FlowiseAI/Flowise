'use client'
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import {
    Button,
    TextField,
    Box,
    Typography,
    IconButton,
    Dialog,
    DialogContent,
    DialogTitle,
    Fade,
    Grid,
    Paper,
    Chip,
    Tooltip,
    Snackbar
} from '@mui/material'
import {
    ExpandMore as ExpandMoreIcon,
    Search as SearchIcon,
    Star as StarIcon,
    StarBorder as StarBorderIcon,
    Visibility as VisibilityIcon,
    Edit as EditIcon,
    Cancel as CancelIcon,
    ChevronRight as ChevronRightIcon
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

// New styled components for the horizontal scrolling UI
const CategorySection = styled(Box)(({ theme }) => ({
    marginBottom: theme.spacing(4),
    transition: 'all 0.3s ease'
}))

const CategoryTitle = styled(Typography)(({ theme }) => ({
    fontWeight: 'bold',
    fontSize: '1.2rem',
    marginBottom: theme.spacing(1),
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center'
}))

const HorizontalScrollContainer = styled(Box)(({ theme }) => ({
    display: 'flex',
    overflowX: 'auto',
    padding: theme.spacing(1, 0),
    gap: theme.spacing(2),
    '&::-webkit-scrollbar': {
        height: '8px'
    },
    '&::-webkit-scrollbar-track': {
        background: alpha(theme.palette.primary.main, 0.05),
        borderRadius: '10px'
    },
    '&::-webkit-scrollbar-thumb': {
        background: alpha(theme.palette.primary.main, 0.2),
        borderRadius: '10px'
    },
    '&::-webkit-scrollbar-thumb:hover': {
        background: alpha(theme.palette.primary.main, 0.3)
    }
}))

const ViewAllButton = styled(Button)(({ theme }) => ({
    color: theme.palette.primary.main,
    padding: 0,
    minWidth: 'auto',
    fontWeight: 'bold',
    transition: 'all 0.3s ease',
    '& .MuiButton-endIcon': {
        transition: 'transform 0.3s ease'
    },
    '&:hover': {
        background: 'none',
        color: theme.palette.primary.dark,
        '& .MuiButton-endIcon': {
            transform: 'translateX(3px)'
        }
    }
}))

const SidekickCard = styled(Paper)(({ theme, onClick }) => ({
    padding: theme.spacing(2),
    marginBottom: theme.spacing(2),
    transition: 'all 0.3s ease',
    display: 'flex',
    flexDirection: 'column',
    height: '220px', // Fixed height for all cards
    position: 'relative',
    // In horizontal scroll, we want fixed width
    '.horizontal-container &': {
        width: '300px',
        minWidth: '300px',
        maxWidth: '300px'
    },
    // In grid view, we want full width
    '.grid-container &': {
        width: '100%'
    },
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
    alignItems: 'flex-start',
    marginBottom: '8px',
    height: '68px' // Fixed height for header (includes title and tags)
})

const SidekickTitle = styled(Typography)({
    fontWeight: 'bold',
    fontSize: '1.1rem',
    lineHeight: '1.2',
    height: '2.4em', // Height for two lines of text
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    display: '-webkit-box',
    WebkitLineClamp: 2,
    WebkitBoxOrient: 'vertical'
})

const SidekickDescription = styled(Typography)({
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    display: '-webkit-box',
    WebkitLineClamp: 2,
    WebkitBoxOrient: 'vertical',
    height: '42px', // Fixed height for two lines of description
    marginBottom: '16px'
})

const SidekickFooter = styled(Box)(({ theme }) => ({
    display: 'flex',
    justifyContent: 'flex-end',
    alignItems: 'center',
    marginTop: 'auto', // Push to bottom
    height: '36px', // Fixed height for footer
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

const ContentWrapper = styled(Box)(({ theme }) => ({
    width: '100%',
    maxWidth: '1200px',

    backgroundColor: theme.palette.background.default,

    padding: theme.spacing(2),
    borderRadius: theme.shape.borderRadius
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

const StyledGrid = styled(Grid)(({ theme }) => ({
    marginTop: theme.spacing(1),
    transition: 'all 0.3s ease'
}))

// Add a new styled component for category filter pills container
const CategoryFilterContainer = styled(Box)(({ theme }) => ({
    display: 'flex',
    overflowX: 'auto',
    padding: theme.spacing(1, 0),
    marginBottom: theme.spacing(2),
    gap: theme.spacing(1),
    '&::-webkit-scrollbar': {
        height: '6px'
    },
    '&::-webkit-scrollbar-track': {
        background: alpha(theme.palette.primary.main, 0.05),
        borderRadius: '10px'
    },
    '&::-webkit-scrollbar-thumb': {
        background: alpha(theme.palette.primary.main, 0.2),
        borderRadius: '10px'
    },
    '&::-webkit-scrollbar-thumb:hover': {
        background: alpha(theme.palette.primary.main, 0.3)
    }
}))

// Add a styled component for the category filter pills
const CategoryFilterChip = styled(Chip)(({ theme, selected }) => ({
    transition: 'all 0.2s ease',
    ...(selected && {
        backgroundColor: theme.palette.primary.main,
        color: theme.palette.common.white,
        fontWeight: 'bold',
        '&:hover': {
            backgroundColor: theme.palette.primary.dark
        }
    })
}))

// Add a new styled component for grid items
const StyledGridItem = styled(Grid)(({ theme }) => ({
    height: '100%',
    '& > div': {
        height: '100%'
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

    // New state to track expanded categories
    const [expandedCategory, setExpandedCategory] = useState<string | null>(null)

    // New state to track view mode (horizontal or grid)
    const [viewMode, setViewMode] = useState<Record<string, 'horizontal' | 'grid'>>({})

    // New state to track active filter category
    const [activeFilterCategory, setActiveFilterCategory] = useState<Record<string, string>>({})

    // New state to track focused category (when "Show All" is clicked)
    const [focusedCategory, setFocusedCategory] = useState<string | null>(null)

    // Function to toggle view mode for a specific category
    const toggleViewMode = useCallback(
        (category: string) => {
            // If we're already in grid view, toggle back to horizontal and clear focused state
            if (viewMode[category] === 'grid') {
                setViewMode((prev) => ({
                    ...prev,
                    [category]: 'horizontal'
                }))
                setExpandedCategory(null)
                setFocusedCategory(null)
            } else {
                // If switching to grid view, set this as the focused category
                setViewMode((prev) => ({
                    ...prev,
                    [category]: 'grid'
                }))
                setExpandedCategory(category)
                setFocusedCategory(category)

                // Set the initial filter to be the same as the category being viewed
                setActiveFilterCategory((prev) => ({
                    ...prev,
                    [category]: category
                }))
            }
        },
        [viewMode]
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

        // Count executable sidekicks per category
        const executableCountByCategory: Record<string, number> = {}

        // Initialize counters for all categories
        const uniqueCatsSet = new Set(allCats)
        uniqueCatsSet.forEach((category) => {
            executableCountByCategory[category] = 0
        })

        // Count executable sidekicks per category
        combinedSidekicks.forEach((sidekick) => {
            if (sidekick.isExecutable) {
                const categories = [
                    sidekick.chatflow.category,
                    ...(sidekick.chatflow.categories || []),
                    ...(sidekick.categories || [])
                ].filter(Boolean)

                categories.forEach((category) => {
                    if (category && uniqueCatsSet.has(category)) {
                        executableCountByCategory[category] = (executableCountByCategory[category] || 0) + 1
                    }
                })
            }
        })

        // Get unique categories and sort them by:
        // 1. Number of executable sidekicks (descending)
        // 2. Alphabetically (ascending)
        const uniqueCats = [...uniqueCatsSet].sort((a, b) => {
            const countDiff = executableCountByCategory[b] - executableCountByCategory[a]
            return countDiff !== 0 ? countDiff : a.localeCompare(b)
        })

        return {
            top: uniqueCats.slice(0, 4),
            more: uniqueCats.slice(4)
        }
    }, [chatflowCategories, marketplaceSidekicks, combinedSidekicks])

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

    // New function to get sidekicks by category
    const getSidekicksByCategory = useCallback(
        (category: string) => {
            return combinedSidekicks
                .filter((sidekick) => {
                    if (category === 'favorites') return favorites.has(sidekick.id)
                    if (category === 'recent') return sidekick.isRecent
                    if (category === 'all') return true

                    return (
                        sidekick.chatflow.category === category ||
                        sidekick.chatflow.categories?.includes(category) ||
                        sidekick.categories?.includes(category)
                    )
                })
                .sort((a, b) => {
                    if (a.isExecutable !== b.isExecutable) return a.isExecutable ? -1 : 1
                    return a.chatflow.name.localeCompare(b.chatflow.name)
                })
        },
        [combinedSidekicks, favorites]
    )
    const CategoryFilter = useCallback(
        ({ parentCategory, availableCategories }: { parentCategory: string; availableCategories: string[] }) => {
            const handleFilterChange = (filterCategory: string) => {
                setActiveFilterCategory((prev) => ({
                    ...prev,
                    [parentCategory]: filterCategory
                }))
            }

            // Default to parent category if no filter has been set
            const currentFilter = activeFilterCategory[parentCategory] || parentCategory

            return (
                <CategoryFilterContainer>
                    {availableCategories.map((category) => (
                        <CategoryFilterChip
                            key={`filter-${category}`}
                            label={category === 'all' ? 'All' : category.split(';').join(' | ')}
                            clickable
                            selected={category === currentFilter}
                            onClick={() => handleFilterChange(category)}
                            color={category === currentFilter ? 'primary' : 'default'}
                            variant={category === currentFilter ? 'filled' : 'outlined'}
                        />
                    ))}
                </CategoryFilterContainer>
            )
        },
        [activeFilterCategory]
    )
    // Modified function for rendering individual sidekick card
    const renderSidekickCard = useCallback(
        (sidekick: Sidekick) => {
            return (
                <SidekickCard
                    key={sidekick.id}
                    onClick={sidekick.isExecutable ? () => handleCardClick(sidekick) : undefined}
                    sx={{
                        position: 'relative',
                        transition: 'all 0.3s ease',
                        display: 'flex',
                        flexDirection: 'column',
                        ...(!sidekick.isExecutable && {
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
                    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
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
                                {sidekick.chatflow.isOwner && <Chip label='Owner' size='small' color='primary' variant='outlined' />}
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
                                    <WhiteButton variant='outlined' endIcon={<IconCopy />} onClick={(e) => handleClone(sidekick, e)}>
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
                    </Box>
                </SidekickCard>
            )
        },
        [handleCardClick, handleClone, handleEdit, handlePreviewClick, handleSidekickSelect, toggleFavorite, favorites, theme]
    )

    // Render a category section with horizontal scroll
    const renderCategorySection = useCallback(
        (category: string, title: string) => {
            const sidekicks = getSidekicksByCategory(category)
            if (sidekicks.length === 0) return null

            const isExpanded = expandedCategory === category
            const currentViewMode = viewMode[category] || 'horizontal'
            const displaySidekicks = isExpanded ? sidekicks : sidekicks.slice(0, 20)

            // Get all available categories for filtering when in grid view
            const availableCategories = ['all']
                .concat(allCategories.top)
                .concat(allCategories.more)
                .filter((cat) => cat !== category) // Remove the current category since it's the default

            // If a filter is active, filter the sidekicks accordingly
            const currentFilter = activeFilterCategory[category]
            let filteredSidekicks = sidekicks

            if (currentViewMode === 'grid' && currentFilter && currentFilter !== category && currentFilter !== 'all') {
                filteredSidekicks = sidekicks.filter((sidekick) => {
                    return (
                        sidekick.chatflow.category === currentFilter ||
                        sidekick.chatflow.categories?.includes(currentFilter) ||
                        sidekick.categories?.includes(currentFilter)
                    )
                })
            }

            // Special case for favorites - always render in grid view with two rows
            if (category === 'favorites') {
                return (
                    <CategorySection key={category}>
                        <CategoryTitle variant='h6'>
                            {title}
                            {sidekicks.length > 8 && (
                                <ViewAllButton
                                    endIcon={<ChevronRightIcon />}
                                    onClick={() => {
                                        if (isExpanded) {
                                            setExpandedCategory(null)
                                        } else {
                                            setExpandedCategory(category)
                                        }
                                    }}
                                >
                                    {isExpanded ? 'Show less' : 'See all'}
                                </ViewAllButton>
                            )}
                        </CategoryTitle>
                        <StyledGrid container spacing={2} className='grid-container'>
                            {(isExpanded ? sidekicks : sidekicks.slice(0, 8)).map((sidekick) => (
                                <Grid item xs={12} sm={6} md={3} key={`${category}-grid-${sidekick.id}`}>
                                    <Box sx={{ position: 'relative', height: '100%' }}>{renderSidekickCard(sidekick)}</Box>
                                </Grid>
                            ))}
                            {sidekicks.length === 0 && (
                                <Grid item xs={12}>
                                    <Box sx={{ padding: 3, textAlign: 'center' }}>
                                        <Typography variant='body1' color='textSecondary'>
                                            No favorite sidekicks found.
                                        </Typography>
                                    </Box>
                                </Grid>
                            )}
                        </StyledGrid>
                    </CategorySection>
                )
            }

            // If in grid view mode, render the grid layout with category filters
            if (currentViewMode === 'grid' && isExpanded) {
                return (
                    <CategorySection key={category}>
                        <CategoryTitle variant='h6'>
                            {title}
                            <ViewAllButton endIcon={<ChevronRightIcon />} onClick={() => toggleViewMode(category)}>
                                Show less
                            </ViewAllButton>
                        </CategoryTitle>

                        {/* Add category filter pills */}
                        <CategoryFilter parentCategory={category} availableCategories={[category, 'all', ...availableCategories]} />

                        <StyledGrid container spacing={2} className='grid-container'>
                            {filteredSidekicks.length > 0 ? (
                                filteredSidekicks.map((sidekick) => (
                                    <StyledGridItem item xs={12} sm={6} md={4} key={`${category}-grid-${sidekick.id}`}>
                                        <Box sx={{ position: 'relative' }}>{renderSidekickCard(sidekick)}</Box>
                                    </StyledGridItem>
                                ))
                            ) : (
                                <Grid item xs={12}>
                                    <Box sx={{ padding: 3, textAlign: 'center' }}>
                                        <Typography variant='body1' color='textSecondary'>
                                            No sidekicks found in this category.
                                        </Typography>
                                    </Box>
                                </Grid>
                            )}
                        </StyledGrid>
                    </CategorySection>
                )
            }

            // Otherwise, render the horizontal scroll layout
            return (
                <CategorySection key={category}>
                    <CategoryTitle variant='h6'>
                        {title}
                        {sidekicks.length > 6 && (
                            <ViewAllButton
                                endIcon={<ChevronRightIcon />}
                                onClick={() => {
                                    if (isExpanded) {
                                        setExpandedCategory(null)
                                        // Reset view mode when collapsing
                                        setViewMode((prev) => ({
                                            ...prev,
                                            [category]: 'horizontal'
                                        }))
                                    } else {
                                        toggleViewMode(category)
                                    }
                                }}
                            >
                                {isExpanded ? 'Show less' : 'See all'}
                            </ViewAllButton>
                        )}
                    </CategoryTitle>
                    <HorizontalScrollContainer className='horizontal-container'>
                        {displaySidekicks.map((sidekick) => renderSidekickCard(sidekick))}
                    </HorizontalScrollContainer>
                </CategorySection>
            )
        },
        [
            renderSidekickCard,
            getSidekicksByCategory,
            expandedCategory,
            viewMode,
            toggleViewMode,
            allCategories,
            activeFilterCategory,
            CategoryFilter
        ]
    )

    // New function to render only the focused category
    const renderFocusedCategory = useCallback(
        (category: string) => {
            const sidekicks = getSidekicksByCategory(category)
            const categoryName = category.split(';').join(' | ')

            return (
                <CategorySection key={category}>
                    <CategoryTitle variant='h6'>
                        {categoryName}
                        <ViewAllButton endIcon={<ChevronRightIcon />} onClick={() => toggleViewMode(category)}>
                            Back to All
                        </ViewAllButton>
                    </CategoryTitle>

                    <StyledGrid container spacing={2} className='grid-container'>
                        {sidekicks.length > 0 ? (
                            sidekicks.map((sidekick) => (
                                <StyledGridItem item xs={12} sm={6} md={4} key={`${category}-focused-${sidekick.id}`}>
                                    <Box sx={{ position: 'relative' }}>{renderSidekickCard(sidekick)}</Box>
                                </StyledGridItem>
                            ))
                        ) : (
                            <Grid item xs={12}>
                                <Box sx={{ padding: 3, textAlign: 'center' }}>
                                    <Typography variant='body1' color='textSecondary'>
                                        No sidekicks found in this category.
                                    </Typography>
                                </Box>
                            </Grid>
                        )}
                    </StyledGrid>
                </CategorySection>
            )
        },
        [renderSidekickCard, getSidekicksByCategory, toggleViewMode]
    )

    // Replace the old renderSidekickGrid function with our new rendering logic
    const content = useCallback(
        () => (
            <>
                <Box sx={{ pb: 4, display: 'flex', gap: 1 }}>
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

                {searchTerm && fuse ? (
                    // Search results section - Always shown as expanded grid
                    <CategorySection>
                        <CategoryTitle variant='h6'>Search Results</CategoryTitle>
                        {/* Always show category filter pills for search results */}
                        <CategoryFilter
                            parentCategory='search'
                            availableCategories={['all'].concat(allCategories.top).concat(allCategories.more)}
                        />

                        <StyledGrid container spacing={2} className='grid-container'>
                            {fuse
                                .search(searchTerm)
                                .filter((result) => {
                                    const sidekick = result.item
                                    // If a filter is active, filter the search results by category
                                    const currentFilter = activeFilterCategory['search']
                                    if (currentFilter && currentFilter !== 'all') {
                                        return (
                                            sidekick.chatflow.category === currentFilter ||
                                            sidekick.chatflow.categories?.includes(currentFilter) ||
                                            sidekick.categories?.includes(currentFilter)
                                        )
                                    }
                                    return true
                                })
                                .map((result) => (
                                    <StyledGridItem item xs={12} sm={6} md={4} key={`search-grid-${result.item.id}`}>
                                        <Box sx={{ position: 'relative' }}>{renderSidekickCard(result.item)}</Box>
                                    </StyledGridItem>
                                ))}
                            {fuse.search(searchTerm).filter((result) => {
                                const sidekick = result.item
                                const currentFilter = activeFilterCategory['search']
                                if (currentFilter && currentFilter !== 'all') {
                                    return (
                                        sidekick.chatflow.category === currentFilter ||
                                        sidekick.chatflow.categories?.includes(currentFilter) ||
                                        sidekick.categories?.includes(currentFilter)
                                    )
                                }
                                return true
                            }).length === 0 && (
                                <Grid item xs={12}>
                                    <Box sx={{ padding: 3, textAlign: 'center' }}>
                                        <Typography variant='body1' color='textSecondary'>
                                            No sidekicks found matching your criteria.
                                        </Typography>
                                    </Box>
                                </Grid>
                            )}
                        </StyledGrid>
                    </CategorySection>
                ) : focusedCategory ? (
                    // When a category is focused (Show All was clicked), only show that category
                    renderFocusedCategory(focusedCategory)
                ) : (
                    // Regular category sections
                    <>
                        {renderCategorySection('favorites', 'Favorites')}
                        {renderCategorySection('recent', 'Recent')}

                        {/* Map through category-specific sections */}
                        {allCategories.top
                            .concat(allCategories.more)
                            .filter((category) => !['favorites', 'recent'].includes(category)) // Skip already rendered categories
                            .map((category) => renderCategorySection(category, category.split(';').join(' | ')))}
                    </>
                )}

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
        ),
        [
            searchbarRef,
            searchInputValue,
            clearSearchField,
            debouncedSetSearchTerm,
            searchTerm,
            fuse,
            renderCategorySection,
            focusedCategory,
            allCategories,
            isMarketplaceDialogOpen,
            selectedTemplateId,
            handleSidekickSelect,
            renderSidekickCard,
            viewMode,
            toggleViewMode,
            CategoryFilter,
            activeFilterCategory
        ]
    )

    const handleCreateNewSidekick = () => {
        navigate('/canvas')
    }

    // Component to render filter pills for available categories

    if (noDialog) {
        return <ContentWrapper>{content()}</ContentWrapper>
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
                <DialogContent>{content()}</DialogContent>
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
