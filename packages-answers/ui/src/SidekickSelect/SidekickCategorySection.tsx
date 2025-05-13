import { Grid, Box, Typography } from '@mui/material'
import { useCallback } from 'react'
import { Sidekick } from 'types'
import SidekickCard from './SidekickCard'
import {
    CategorySectionContainer,
    CategoryFilterContainer,
    CategoryFilterChip,
    CategoryTitle,
    HorizontalScrollContainer,
    ViewAllButton,
    StyledGrid,
    StyledGridItem
} from './StyledComponents'
import ChevronRightIcon from '@mui/icons-material/ChevronRight'

export const CategoryFilter = ({
    parentCategory,
    availableCategories,
    activeFilterCategory,
    setActiveFilterCategory,
    sidekicksByCategoryCache
}: {
    parentCategory: string
    availableCategories: string[]
    activeFilterCategory: Record<string, string>
    setActiveFilterCategory: (filter: Record<string, string>) => void
    sidekicksByCategoryCache: any
}) => {
    const handleFilterChange = useCallback(
        (filterCategory: string) => {
            setActiveFilterCategory((prev: any) => ({
                ...prev,
                [parentCategory]: filterCategory
            }))

            // When changing category filter, invalidate any relevant cache
            if (sidekicksByCategoryCache.current[parentCategory]) {
                delete sidekicksByCategoryCache.current[parentCategory]
            }
        },
        [parentCategory]
    )

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
}

export const CategorySectionn = ({
    user,
    category,
    title,
    sidekicks,
    isLoading,
    allCategories,
    expandedCategory,
    viewMode,
    toggleViewMode,
    renderSkeletonCards,
    handleSidekickSelect,
    activeFilterCategory,
    favorites,
    toggleFavorite,
    navigate,
    setExpandedCategory,
    setSelectedTemplateId,
    setIsMarketplaceDialogOpen,
    setViewMode,
    setActiveFilterCategory,
    sidekicksByCategoryCache
}: {
    user: any
    category: string
    title: string
    sidekicks: Sidekick[]
    isLoading: boolean
    allCategories: { top: string[]; more: string[] }
    expandedCategory: string | null
    viewMode: Record<string, string>
    toggleViewMode: (category: string) => void
    renderSkeletonCards: (count: number) => React.ReactNode
    handleSidekickSelect: (sidekick: Sidekick) => void
    activeFilterCategory: Record<string, string>
    toggleFavorite: (sidekick: Sidekick) => void
    navigate: any
    setExpandedCategory: any
    setSelectedTemplateId: any
    setIsMarketplaceDialogOpen: any
    setViewMode: any
    setActiveFilterCategory: any
    sidekicksByCategoryCache: any
    favorites: any
}) => {
    // Render a category section with horizontal scroll
    // If data is loading or there are no categories yet, show skeleton cards
    if (isLoading || (!isLoading && allCategories.top.length === 0 && allCategories.more.length === 0)) {
        return (
            <CategorySectionContainer key={category}>
                <CategoryTitle variant='h6'>{title}</CategoryTitle>
                <HorizontalScrollContainer className='horizontal-container'>{renderSkeletonCards(6)}</HorizontalScrollContainer>
            </CategorySectionContainer>
        )
    }

    // If no sidekicks in this category and loading is complete, don't display the category at all
    if (sidekicks.length === 0 && !isLoading) {
        return null
    }

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
        // Only display if there are items, or show loading skeleton
        if (sidekicks.length === 0 && !isLoading) {
            return null
        }

        return (
            <CategorySectionContainer key={category}>
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
                            <Box sx={{ position: 'relative', height: '100%' }}>
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
                        </Grid>
                    ))}
                </StyledGrid>
            </CategorySectionContainer>
        )
    }

    // If in grid view mode, render the grid layout with category filters
    if (currentViewMode === 'grid' && isExpanded) {
        return (
            <CategorySectionContainer key={category}>
                <CategoryTitle variant='h6'>
                    {title}
                    <ViewAllButton endIcon={<ChevronRightIcon />} onClick={() => toggleViewMode(category)}>
                        Show less
                    </ViewAllButton>
                </CategoryTitle>

                {/* Add category filter pills */}
                <CategoryFilter
                    parentCategory={category}
                    availableCategories={[category, 'all', ...availableCategories]}
                    activeFilterCategory={activeFilterCategory}
                    setActiveFilterCategory={setActiveFilterCategory}
                    sidekicksByCategoryCache={sidekicksByCategoryCache}
                />

                <StyledGrid container spacing={2} className='grid-container'>
                    {filteredSidekicks.length > 0 ? (
                        filteredSidekicks.map((sidekick) => (
                            <StyledGridItem item xs={12} sm={6} md={4} key={`${category}-grid-${sidekick.id}`}>
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
            </CategorySectionContainer>
        )
    }

    // Otherwise, render the horizontal scroll layout
    return (
        <CategorySectionContainer key={category}>
            <CategoryTitle variant='h6'>
                {title}
                {sidekicks.length > 6 && (
                    <ViewAllButton
                        endIcon={<ChevronRightIcon />}
                        onClick={() => {
                            if (isExpanded) {
                                setExpandedCategory(null)
                                // Reset view mode when collapsing
                                setViewMode((prev: any) => ({
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
                {displaySidekicks.map((sidekick) => (
                    <SidekickCard
                        key={sidekick.id}
                        sidekick={sidekick}
                        user={user}
                        favorites={favorites}
                        navigate={navigate}
                        handleSidekickSelect={handleSidekickSelect}
                        setSelectedTemplateId={setSelectedTemplateId}
                        setIsMarketplaceDialogOpen={setIsMarketplaceDialogOpen}
                        toggleFavorite={toggleFavorite}
                    />
                ))}
            </HorizontalScrollContainer>
        </CategorySectionContainer>
    )
}
