'use client'
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { Button, TextField, Box, Typography, DialogContent, DialogTitle, Fade, Grid, Snackbar } from '@mui/material'
import {
    ExpandMore as ExpandMoreIcon,
    Search as SearchIcon,
    Cancel as CancelIcon,
    ChevronRight as ChevronRightIcon
} from '@mui/icons-material'
import useSWR from 'swr'
import { useUser } from '@auth0/nextjs-auth0/client'
// Using any type for now since we don't have the declaration file
// eslint-disable-next-line @typescript-eslint/no-explicit-any
import marketplacesApi from '@/api/marketplaces'
// Temporary type definition for Sidekick

import { useAnswers } from '../AnswersContext'

import { useNavigate } from '@/utils/navigation'
import dynamic from 'next/dynamic'

import {
    SkeletonCard,
    SkeletonItem,
    CategorySectionContainer,
    CategoryTitle,
    ViewAllButton,
    StyledGrid,
    StyledGridItem,
    ContentWrapper,
    StyledDialog
} from './StyledComponents'
import SidekickCard from './SidekickCard'
import { Sidekick } from './SidekickSelect.types'
import useSidekickFavorites from './hooks/useSidekickFavorites'
import useSidekickSearch from './hooks/useSidekickSearch'

import { CategoryFilter, CategorySectionn } from './SidekickCategorySection'

const MarketplaceLandingDialog = dynamic(() => import('@/views/chatflows/MarketplaceLandingDialog'), { ssr: false })

// Add marketplace dialog type definition
interface MarketplaceDialogProps {
    open: boolean
    onClose: () => void
    templateId: string | null
    onUse: (sidekick: Sidekick) => void
}

// Component props
interface SidekickSelectProps {
    onSidekickSelected?: (sidekick: Sidekick) => void
    sidekicks?: Sidekick[]
    noDialog?: boolean
}

// Add proper marketplaceDialog component type declaration
const MarketplaceDialogComponent = MarketplaceLandingDialog as React.ComponentType<MarketplaceDialogProps>

const SidekickSelect: React.FC<SidekickSelectProps> = ({ sidekicks: defaultSidekicks = [], noDialog = false }) => {
    // Add render counter for debugging
    const renderCountRef = useRef(0)
    renderCountRef.current++

    // Performance debug flag - set to true to see performance logs
    const enablePerformanceLogs = true

    // Add logger utility to avoid repeated string concatenation when logging is disabled
    const perfLog = useCallback(
        (message: string, ...args: any[]) => {
            if (enablePerformanceLogs) {
                console.log(`[SidekickSelect] ${message}`, ...args)
            }
        },
        [enablePerformanceLogs]
    )

    // Track category render counts to identify excessive rerenders
    const categoryRenderCountsRef = useRef<Record<string, number>>({})

    // Improved cache structure with better typing and timestamp tracking
    const sidekicksByCategoryCache = useRef<Record<string, { data: Sidekick[]; timestamp: number }>>({})

    const { chat, setSidekick, sidekick: selectedSidekick, setSidekick: setSelectedSidekick } = useAnswers()
    const { user } = useUser()

    // Use the favorites hook
    const { favorites, toggleFavorite } = useSidekickFavorites()

    const [open, setOpen] = useState(false || noDialog)

    const navigate = useNavigate()

    const [isMarketplaceDialogOpen, setIsMarketplaceDialogOpen] = useState(false)
    const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null)

    const [showCopyMessage, setShowCopyMessage] = useState(false)

    // New state to track expanded categories
    const [expandedCategory, setExpandedCategory] = useState<string | null>(null)

    // New state to track view mode (horizontal or grid)
    const [viewMode, setViewMode] = useState<Record<string, 'horizontal' | 'grid'>>({})

    // New state to track active filter category
    const [activeFilterCategory, setActiveFilterCategory] = useState<Record<string, string>>({})

    // New state to track focused category (when "Show All" is clicked)
    const [focusedCategory, setFocusedCategory] = useState<string | null>(null)

    // Fetcher with better caching and error handling
    const fetcher = useCallback(async (url: string) => {
        const startTime = enablePerformanceLogs ? performance.now() : 0
        try {
            const res = await fetch(url)
            if (res.status === 401) {
                window.location.href = '/api/auth/login?redirect_uri=' + encodeURIComponent(window.location.href)
            } else {
                const data = await res.json()
                if (enablePerformanceLogs) {
                    const endTime = performance.now()
                    console.log(
                        `[SidekickSelect] API data fetched, sidekicks count: ${
                            data?.sidekicks?.length || 0
                        }, timestamp: ${new Date().toISOString()}`
                    )
                    console.log(`[SidekickSelect] API fetch took ${(endTime - startTime).toFixed(2)}ms`)
                }

                // Clear the cache when new data is fetched
                sidekicksByCategoryCache.current = {}

                return data
            }
        } catch (error) {
            console.log('error', error)
            if (error instanceof Response && error.status === 401) {
                window.location.href = '/api/auth/login?redirect_uri=' + encodeURIComponent(window.location.href)
            }
            return { sidekicks: [], categories: { top: [], more: [] } }
        }
    }, [])

    // Use the optimized fetcher
    const { data, isLoading } = useSWR('/api/sidekicks', fetcher, {
        fallbackData: defaultSidekicks,
        revalidateOnFocus: false, // Reduce unnecessary refetches
        dedupingInterval: 10000 // Dedupe requests within 10 seconds
    })

    const { data: marketplaceSidekicks = [] } = useSWR('marketplaceSidekicks', async () => {
        const startTime = enablePerformanceLogs ? performance.now() : 0
        try {
            const { data: marketplaceChatflows } = await marketplacesApi.getAllTemplatesFromMarketplaces()
            const result = marketplaceChatflows?.map((chatflow: any) => ({
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

            if (enablePerformanceLogs) {
                const endTime = performance.now()
                console.log(`[SidekickSelect] Marketplace fetch took ${(endTime - startTime).toFixed(2)}ms, count: ${result.length || 0}`)
            }

            return result
        } catch (error) {
            console.error('Error fetching marketplace sidekicks:', error)
            return []
        }
    })

    const { sidekicks: allSidekicks = [], categories: chatflowCategories = { top: [], more: [] } } = data

    // Optimize combinedSidekicks calculation with better dependency tracking
    const combinedSidekicks = useMemo(() => {
        const startTime = enablePerformanceLogs ? performance.now() : 0

        if (!allSidekicks || !marketplaceSidekicks) {
            return []
        }

        const sidekickMap = new Map<string, Sidekick>()

        // Process all sidekicks and efficiently merge them
        allSidekicks.forEach((sidekick: any) => {
            sidekickMap.set(sidekick.id, sidekick)
        })

        marketplaceSidekicks.forEach((sidekick: any) => {
            const existingSidekick = sidekickMap.get(sidekick.id)
            if (!existingSidekick || (!existingSidekick.isExecutable && sidekick.isExecutable)) {
                sidekickMap.set(sidekick.id, sidekick)
            }
        })

        const result = Array.from(sidekickMap.values())

        if (enablePerformanceLogs) {
            const endTime = performance.now()
            console.log(
                `[SidekickSelect] Recalculating combinedSidekicks, allSidekicks: ${allSidekicks.length}, marketplaceSidekicks: ${marketplaceSidekicks.length}`
            )
            console.log(
                `[SidekickSelect] combinedSidekicks calculation completed in ${(endTime - startTime).toFixed(2)}ms, result count: ${
                    result.length
                }`
            )
        }

        // When recalculating combined sidekicks, clear stale category cache
        // But preserve favorites cache which is based on the favorites Set
        Object.keys(sidekicksByCategoryCache.current)
            .filter((category) => category !== 'favorites')
            .forEach((category) => {
                delete sidekicksByCategoryCache.current[category]
            })

        return result
    }, [allSidekicks, marketplaceSidekicks, perfLog])

    // Use search hook
    const { searchInputValue, searchTerm, searchbarRef, fuse, searchResults, handleSearchChange, clearSearchField } = useSidekickSearch({
        sidekicks: combinedSidekicks || [],
        enableLogs: enablePerformanceLogs,
        initialTab: 'all'
    })

    // Improved memoized search results with proper typing
    const filteredSearchResults = useMemo(() => {
        const currentFilter = activeFilterCategory['search']

        if (!currentFilter || currentFilter === 'all') {
            return searchResults
        }

        return searchResults.filter((sidekick) => {
            return (
                sidekick.chatflow.category === currentFilter ||
                sidekick.chatflow.categories?.includes(currentFilter) ||
                sidekick.categories?.includes(currentFilter)
            )
        })
    }, [searchResults, activeFilterCategory])

    // Optimized selector function with memoization and caching
    const getSidekicksByCategory = useCallback(
        (category: string) => {
            // Initialize render counter for this category if not exists
            if (!categoryRenderCountsRef.current[category]) {
                categoryRenderCountsRef.current[category] = 0
            }
            categoryRenderCountsRef.current[category]++

            const startTime = enablePerformanceLogs ? performance.now() : 0

            perfLog(`Getting sidekicks for category: ${category}, render #${categoryRenderCountsRef.current[category]}`)

            // Return from cache if available (with cache age check)
            if (sidekicksByCategoryCache.current[category]) {
                // Only use cache if it's less than 5 seconds old or for stable categories
                const cacheAge = Date.now() - sidekicksByCategoryCache.current[category].timestamp
                const isStableCategory = ['favorites', 'recent'].includes(category)

                if (isStableCategory || cacheAge < 5000) {
                    perfLog(`Using cached results for category: ${category}, age: ${cacheAge}ms`)
                    return sidekicksByCategoryCache.current[category].data
                }

                perfLog(`Cache expired for category: ${category}, age: ${cacheAge}ms`)
            }

            // Optimize filtering logic with early returns
            let result: Sidekick[] = []

            // Fast path for common categories
            if (category === 'favorites') {
                result = combinedSidekicks.filter((sidekick) => favorites.has(sidekick.id))
            } else if (category === 'recent') {
                result = combinedSidekicks.filter((sidekick) => sidekick.isRecent)
            } else if (category === 'all') {
                result = combinedSidekicks
            } else {
                // Standard category filtering
                result = combinedSidekicks.filter(
                    (sidekick) =>
                        sidekick.chatflow.category === category ||
                        sidekick.chatflow.categories?.includes(category) ||
                        sidekick.categories?.includes(category)
                )
            }

            // Apply sorting consistently
            result = result.sort((a, b) => {
                if (a.isExecutable !== b.isExecutable) return a.isExecutable ? -1 : 1
                return a.chatflow.name.localeCompare(b.chatflow.name)
            })

            if (enablePerformanceLogs) {
                const endTime = performance.now()
                perfLog(`Category ${category} filtering completed in ${(endTime - startTime).toFixed(2)}ms, result count: ${result.length}`)
            }

            // Store in cache with timestamp
            sidekicksByCategoryCache.current[category] = {
                data: result,
                timestamp: Date.now()
            }

            return result
        },
        [combinedSidekicks, favorites, perfLog]
    )

    const allCategories = useMemo(() => {
        const startTime = enablePerformanceLogs ? performance.now() : 0

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

        const result = {
            top: uniqueCats.slice(0, 4),
            more: uniqueCats.slice(4)
        }

        if (enablePerformanceLogs) {
            const endTime = performance.now()
            console.log(
                `[SidekickSelect] allCategories calculation completed in ${(endTime - startTime).toFixed(2)}ms, top: ${
                    result.top.length
                }, more: ${result.more.length}`
            )
        }

        return result
    }, [chatflowCategories, marketplaceSidekicks, combinedSidekicks])

    const handleSidekickSelect = (sidekick: Sidekick) => {
        console.log('[SidekickSelect] Sidekick selected:', sidekick.id)
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

    // Selectively invalidate cache entries instead of clearing the entire cache
    useEffect(() => {
        // Only invalidate "favorites" category when favorites change
        if (sidekicksByCategoryCache.current['favorites']) {
            delete sidekicksByCategoryCache.current['favorites']
        }
    }, [favorites])

    // Selectively invalidate relevant cache entries when sidekicks change
    useEffect(() => {
        // Get categories that need invalidation
        const categoriesToInvalidate = Object.keys(sidekicksByCategoryCache.current).filter((category) => category !== 'favorites') // Keep favorites cache if only sidekicks changed

        // Selectively remove affected categories from cache
        categoriesToInvalidate.forEach((category) => {
            delete sidekicksByCategoryCache.current[category]
        })
    }, [combinedSidekicks])

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

    // Function to render skeleton cards
    const renderSkeletonCards = (count: number, isHorizontal = true) => {
        return Array.from({ length: count }).map((_, index) => (
            <SkeletonCard key={`skeleton-${index}`} className={isHorizontal ? 'horizontal-container' : 'grid-container'}>
                <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}>
                        <SkeletonItem variant='rectangular' width='70%' height={28} />
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', width: '100%', gap: 1, mt: 1 }}>
                            <SkeletonItem variant='rectangular' width='40%' height={24} />
                        </Box>
                    </Box>
                    <SkeletonItem variant='rectangular' width='100%' height={42} />
                    <Box sx={{ mt: 'auto', display: 'flex', justifyContent: 'flex-end', gap: 1, pt: 2 }}>
                        <SkeletonItem variant='circular' width={36} height={36} />
                        <SkeletonItem variant='circular' width={36} height={36} />
                        <SkeletonItem variant='rectangular' width={60} height={36} sx={{ borderRadius: '18px' }} />
                    </Box>
                </Box>
            </SkeletonCard>
        ))
    }

    // New function to render only the focused category
    const renderFocusedCategory = useCallback(
        (category: string) => {
            const sidekicks = getSidekicksByCategory(category)
            const categoryName = category.split(';').join(' | ')

            // If data is loading, show skeleton grid
            if (isLoading || (!isLoading && allCategories.top.length === 0 && allCategories.more.length === 0)) {
                return (
                    <CategorySectionContainer key={category}>
                        <CategoryTitle variant='h6'>
                            {categoryName}
                            <SkeletonItem variant='rectangular' width={100} height={36} sx={{ borderRadius: '18px' }} />
                        </CategoryTitle>
                        <StyledGrid container spacing={2} className='grid-container'>
                            {Array.from({ length: 6 }).map((_, index) => (
                                <StyledGridItem item xs={12} sm={6} md={4} key={`skeleton-grid-${index}`}>
                                    <Box sx={{ position: 'relative' }}>{renderSkeletonCards(1, false)}</Box>
                                </StyledGridItem>
                            ))}
                        </StyledGrid>
                    </CategorySectionContainer>
                )
            }

            // If there are no sidekicks in this category, don't display anything
            if (sidekicks.length === 0 && !isLoading) {
                setFocusedCategory(null) // Reset focused category to return to main view
                return null
            }

            return (
                <CategorySectionContainer key={category}>
                    <CategoryTitle variant='h6'>
                        {categoryName}
                        <ViewAllButton endIcon={<ChevronRightIcon />} onClick={() => toggleViewMode(category)}>
                            Back to All
                        </ViewAllButton>
                    </CategoryTitle>

                    <StyledGrid container spacing={2} className='grid-container'>
                        {sidekicks.map((sidekick) => (
                            <StyledGridItem item xs={12} sm={6} md={4} key={`${category}-focused-${sidekick.id}`}>
                                <Box sx={{ position: 'relative' }}>
                                    <SidekickCard
                                        sidekick={sidekick}
                                        user={user}
                                        favorites={favorites}
                                        navigate={navigate}
                                        handleSidekickSelect={handleSidekickSelect}
                                        setSelectedTemplateId={setSelectedTemplateId}
                                        setIsMarketplaceDialogOpen={setIsMarketplaceDialogOpen}
                                        toggleFavorite={toggleFavorite}
                                    />
                                </Box>
                            </StyledGridItem>
                        ))}
                    </StyledGrid>
                </CategorySectionContainer>
            )
        },
        [getSidekicksByCategory, toggleViewMode, isLoading, renderSkeletonCards, allCategories, setFocusedCategory]
    )

    const handleCreateNewSidekick = () => {
        navigate('/canvas')
    }

    // Optimize the content function to reduce excessive re-renders
    const content = useMemo(
        () => {
            const startTime = enablePerformanceLogs ? performance.now() : 0

            perfLog(`Rendering main content, render #${renderCountRef.current}`)

            const searchStartTime = searchTerm && fuse ? performance.now() : 0

            // Separate memo for search results to avoid full re-render when only search changes
            const searchResults =
                searchTerm && fuse ? (
                    <CategorySectionContainer>
                        <CategoryTitle variant='h6'>Search Results</CategoryTitle>

                        {/* Add category filter pills for search results */}
                        <CategoryFilter
                            parentCategory='search'
                            availableCategories={['all'].concat(allCategories.top).concat(allCategories.more)}
                            activeFilterCategory={activeFilterCategory}
                            setActiveFilterCategory={setActiveFilterCategory}
                            sidekicksByCategoryCache={sidekicksByCategoryCache}
                        />

                        {isLoading ? (
                            <StyledGrid container spacing={2} className='grid-container'>
                                {Array.from({ length: 6 }).map((_, index) => (
                                    <StyledGridItem item xs={12} sm={6} md={4} key={`search-skeleton-${index}`}>
                                        <Box sx={{ position: 'relative' }}>{renderSkeletonCards(1, false)}</Box>
                                    </StyledGridItem>
                                ))}
                            </StyledGrid>
                        ) : (
                            <StyledGrid container spacing={2} className='grid-container'>
                                {filteredSearchResults.map(
                                    (result) =>
                                        result && (
                                            <StyledGridItem item xs={12} sm={6} md={4} key={`search-grid-${result.id}`}>
                                                <Box sx={{ position: 'relative' }}>
                                                    <SidekickCard
                                                        sidekick={result}
                                                        user={user}
                                                        favorites={favorites}
                                                        navigate={navigate}
                                                        handleSidekickSelect={handleSidekickSelect}
                                                        setSelectedTemplateId={setSelectedTemplateId}
                                                        setIsMarketplaceDialogOpen={setIsMarketplaceDialogOpen}
                                                        toggleFavorite={toggleFavorite}
                                                    />
                                                </Box>
                                            </StyledGridItem>
                                        )
                                )}
                                {filteredSearchResults.length === 0 && (
                                    <Grid item xs={12}>
                                        <Box sx={{ padding: 3, textAlign: 'center' }}>
                                            <Typography variant='body1' color='textSecondary'>
                                                No sidekicks found matching your criteria.
                                            </Typography>
                                        </Box>
                                    </Grid>
                                )}
                            </StyledGrid>
                        )}
                    </CategorySectionContainer>
                ) : null

            const result = (
                <>
                    <Box sx={{ pb: 4, display: 'flex', gap: 1 }}>
                        <TextField
                            inputRef={searchbarRef}
                            key={'search-term-input'}
                            fullWidth
                            variant='outlined'
                            style={{ position: 'relative' }}
                            placeholder='"Create an image of..." or "Write a poem about..." or "Generate a report for...")'
                            value={searchInputValue}
                            onChange={(e) => {
                                handleSearchChange(e.target.value)
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
                        // Search results section
                        searchResults
                    ) : focusedCategory ? (
                        // When a category is focused (Show All was clicked), only show that category
                        renderFocusedCategory(focusedCategory)
                    ) : (
                        // Regular category sections
                        <>
                            {/* Always show basic categories with skeletons while loading */}
                            {isLoading ? (
                                <>
                                    <CategorySectionn
                                        user={user}
                                        category='favorites'
                                        title='Favorites'
                                        sidekicks={getSidekicksByCategory('favorites')}
                                        isLoading={isLoading}
                                        allCategories={allCategories}
                                        expandedCategory={expandedCategory}
                                        viewMode={viewMode}
                                        toggleViewMode={toggleViewMode}
                                        renderSkeletonCards={renderSkeletonCards}
                                        handleSidekickSelect={handleSidekickSelect}
                                        activeFilterCategory={activeFilterCategory}
                                        favorites={favorites}
                                        toggleFavorite={toggleFavorite}
                                        navigate={navigate}
                                        setExpandedCategory={setExpandedCategory}
                                        setSelectedTemplateId={setSelectedTemplateId}
                                        setIsMarketplaceDialogOpen={setIsMarketplaceDialogOpen}
                                        setViewMode={setViewMode}
                                        setActiveFilterCategory={setActiveFilterCategory}
                                        sidekicksByCategoryCache={sidekicksByCategoryCache}
                                    />
                                    <CategorySectionn
                                        user={user}
                                        category='recent'
                                        title='Recent'
                                        sidekicks={getSidekicksByCategory('recent')}
                                        isLoading={isLoading}
                                        allCategories={allCategories}
                                        expandedCategory={expandedCategory}
                                        viewMode={viewMode}
                                        toggleViewMode={toggleViewMode}
                                        renderSkeletonCards={renderSkeletonCards}
                                        handleSidekickSelect={handleSidekickSelect}
                                        activeFilterCategory={activeFilterCategory}
                                        favorites={favorites}
                                        toggleFavorite={toggleFavorite}
                                        navigate={navigate}
                                        setExpandedCategory={setExpandedCategory}
                                        setSelectedTemplateId={setSelectedTemplateId}
                                        setIsMarketplaceDialogOpen={setIsMarketplaceDialogOpen}
                                        setViewMode={setViewMode}
                                        setActiveFilterCategory={setActiveFilterCategory}
                                        sidekicksByCategoryCache={sidekicksByCategoryCache}
                                    />
                                    <CategorySectionn
                                        user={user}
                                        category='Official'
                                        title='Official'
                                        sidekicks={getSidekicksByCategory('Official')}
                                        isLoading={isLoading}
                                        allCategories={allCategories}
                                        expandedCategory={expandedCategory}
                                        viewMode={viewMode}
                                        toggleViewMode={toggleViewMode}
                                        renderSkeletonCards={renderSkeletonCards}
                                        handleSidekickSelect={handleSidekickSelect}
                                        activeFilterCategory={activeFilterCategory}
                                        favorites={favorites}
                                        toggleFavorite={toggleFavorite}
                                        navigate={navigate}
                                        setExpandedCategory={setExpandedCategory}
                                        setSelectedTemplateId={setSelectedTemplateId}
                                        setIsMarketplaceDialogOpen={setIsMarketplaceDialogOpen}
                                        setViewMode={setViewMode}
                                        setActiveFilterCategory={setActiveFilterCategory}
                                        sidekicksByCategoryCache={sidekicksByCategoryCache}
                                    />
                                </>
                            ) : combinedSidekicks.length === 0 ? (
                                // When no sidekicks exist but loading is complete, show empty state message
                                <Box
                                    sx={{
                                        display: 'flex',
                                        flexDirection: 'column',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        py: 8
                                    }}
                                >
                                    <Typography variant='h6' color='textSecondary' gutterBottom>
                                        No sidekicks available
                                    </Typography>
                                    <Typography variant='body1' color='textSecondary' align='center' sx={{ maxWidth: '500px', mb: 4 }}>
                                        No sidekicks were found. Create a new sidekick or check back later.
                                    </Typography>
                                    <Button variant='contained' color='primary' onClick={handleCreateNewSidekick}>
                                        Create New Sidekick
                                    </Button>
                                </Box>
                            ) : (
                                // Otherwise render all categories that have items
                                <>
                                    <CategorySectionn
                                        user={user}
                                        category='favorites'
                                        title='Favorites'
                                        sidekicks={getSidekicksByCategory('favorites')}
                                        isLoading={isLoading}
                                        allCategories={allCategories}
                                        expandedCategory={expandedCategory}
                                        viewMode={viewMode}
                                        toggleViewMode={toggleViewMode}
                                        renderSkeletonCards={renderSkeletonCards}
                                        handleSidekickSelect={handleSidekickSelect}
                                        activeFilterCategory={activeFilterCategory}
                                        favorites={favorites}
                                        toggleFavorite={toggleFavorite}
                                        navigate={navigate}
                                        setExpandedCategory={setExpandedCategory}
                                        setSelectedTemplateId={setSelectedTemplateId}
                                        setIsMarketplaceDialogOpen={setIsMarketplaceDialogOpen}
                                        setViewMode={setViewMode}
                                        setActiveFilterCategory={setActiveFilterCategory}
                                        sidekicksByCategoryCache={sidekicksByCategoryCache}
                                    />
                                    <CategorySectionn
                                        user={user}
                                        category='recent'
                                        title='Recent'
                                        sidekicks={getSidekicksByCategory('recent')}
                                        isLoading={isLoading}
                                        allCategories={allCategories}
                                        expandedCategory={expandedCategory}
                                        viewMode={viewMode}
                                        toggleViewMode={toggleViewMode}
                                        renderSkeletonCards={renderSkeletonCards}
                                        handleSidekickSelect={handleSidekickSelect}
                                        activeFilterCategory={activeFilterCategory}
                                        favorites={favorites}
                                        toggleFavorite={toggleFavorite}
                                        navigate={navigate}
                                        setExpandedCategory={setExpandedCategory}
                                        setSelectedTemplateId={setSelectedTemplateId}
                                        setIsMarketplaceDialogOpen={setIsMarketplaceDialogOpen}
                                        setViewMode={setViewMode}
                                        setActiveFilterCategory={setActiveFilterCategory}
                                        sidekicksByCategoryCache={sidekicksByCategoryCache}
                                    />
                                    <CategorySectionn
                                        user={user}
                                        category='Official'
                                        title='Official'
                                        sidekicks={getSidekicksByCategory('Official')}
                                        isLoading={isLoading}
                                        allCategories={allCategories}
                                        expandedCategory={expandedCategory}
                                        viewMode={viewMode}
                                        toggleViewMode={toggleViewMode}
                                        renderSkeletonCards={renderSkeletonCards}
                                        handleSidekickSelect={handleSidekickSelect}
                                        activeFilterCategory={activeFilterCategory}
                                        favorites={favorites}
                                        toggleFavorite={toggleFavorite}
                                        navigate={navigate}
                                        setExpandedCategory={setExpandedCategory}
                                        setSelectedTemplateId={setSelectedTemplateId}
                                        setIsMarketplaceDialogOpen={setIsMarketplaceDialogOpen}
                                        setViewMode={setViewMode}
                                        setActiveFilterCategory={setActiveFilterCategory}
                                        sidekicksByCategoryCache={sidekicksByCategoryCache}
                                    />

                                    {/* Map through category-specific sections but only render visible ones for performance */}
                                    {allCategories.top
                                        .concat(allCategories.more.slice(0, expandedCategory ? allCategories.more.length : 4)) // Limit categories when not expanded
                                        .filter((category) => !['favorites', 'recent', 'Official'].includes(category)) // Skip already rendered categories
                                        .map((category) => (
                                            <CategorySectionn
                                                key={category}
                                                user={user}
                                                category={category}
                                                title={category.split(';').join(' | ')}
                                                sidekicks={getSidekicksByCategory(category)}
                                                isLoading={isLoading}
                                                allCategories={allCategories}
                                                expandedCategory={expandedCategory}
                                                viewMode={viewMode}
                                                toggleViewMode={toggleViewMode}
                                                renderSkeletonCards={renderSkeletonCards}
                                                handleSidekickSelect={handleSidekickSelect}
                                                activeFilterCategory={activeFilterCategory}
                                                favorites={favorites}
                                                toggleFavorite={toggleFavorite}
                                                navigate={navigate}
                                                setExpandedCategory={setExpandedCategory}
                                                setSelectedTemplateId={setSelectedTemplateId}
                                                setIsMarketplaceDialogOpen={setIsMarketplaceDialogOpen}
                                                setViewMode={setViewMode}
                                                setActiveFilterCategory={setActiveFilterCategory}
                                                sidekicksByCategoryCache={sidekicksByCategoryCache}
                                            />
                                        ))}
                                </>
                            )}
                        </>
                    )}

                    <MarketplaceDialogComponent
                        key='marketplace-dialog'
                        open={isMarketplaceDialogOpen}
                        onClose={() => {
                            setIsMarketplaceDialogOpen(false)
                            setSelectedTemplateId(null)
                            window.history.pushState(null, '', window.location.pathname)
                        }}
                        templateId={selectedTemplateId}
                        onUse={(sidekick) => handleSidekickSelect(sidekick as Sidekick)}
                    />
                </>
            )

            if (enablePerformanceLogs) {
                const endTime = performance.now()

                if (searchStartTime > 0) {
                    const searchEndTime = performance.now()
                    perfLog(`Search rendering took ${(searchEndTime - searchStartTime).toFixed(2)}ms`)
                }

                perfLog(`Content rendering completed in ${(endTime - startTime).toFixed(2)}ms`)
            }

            return result
        },
        // Strictly limit dependencies to reduce re-renders
        [
            searchTerm,
            filteredSearchResults,
            focusedCategory,
            isLoading,
            allCategories.top,
            allCategories.more.length,
            isMarketplaceDialogOpen,
            selectedTemplateId,
            searchInputValue,
            combinedSidekicks.length,

            // Functions

            renderFocusedCategory,

            renderSkeletonCards,

            handleSearchChange,
            clearSearchField,
            handleCreateNewSidekick,
            handleSidekickSelect,

            // Utils
            fuse,
            perfLog,
            expandedCategory
        ]
    )

    if (enablePerformanceLogs) {
        console.log(`[SidekickSelect] Before final render, noDialog: ${noDialog}, render #${renderCountRef.current}`)
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
                <DialogContent>{content}</DialogContent>
            </StyledDialog>
            <MarketplaceDialogComponent
                key='marketplace-dialog'
                open={isMarketplaceDialogOpen}
                onClose={() => {
                    setIsMarketplaceDialogOpen(false)
                    setSelectedTemplateId(null)
                    window.history.pushState(null, '', window.location.pathname)
                }}
                templateId={selectedTemplateId}
                onUse={(sidekick) => handleSidekickSelect(sidekick as Sidekick)}
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
