'use client'
import React from 'react'
import { TextField, Box, Button, Grid, Typography } from '@mui/material'
import { Search as SearchIcon, Cancel as CancelIcon } from '@mui/icons-material'
import { Sidekick } from './SidekickSelect.types'
import { CategorySectionContainer, CategoryTitle, StyledGrid, StyledGridItem } from './StyledComponents'
import SidekickCard from './SidekickCard'
import { CategoryFilter } from './SidekickCategorySection'
import { UserProfile } from '@auth0/nextjs-auth0/client'
import useSidekickSearch from './hooks/useSidekickSearch'

interface SidekickSearchPanelProps {
    sidekicks: Sidekick[]
    allCategories: { top: string[]; more: string[] }
    isLoading: boolean
    user?: UserProfile
    activeFilterCategory: Record<string, string>
    setActiveFilterCategory: React.Dispatch<React.SetStateAction<Record<string, string>>>
    favorites: Set<string>
    toggleFavorite: (sidekick: Sidekick, e?: React.MouseEvent) => void
    navigate: any
    handleSidekickSelect: (sidekick: Sidekick) => void
    setSelectedTemplateId: React.Dispatch<React.SetStateAction<string | null>>
    setIsMarketplaceDialogOpen: React.Dispatch<React.SetStateAction<boolean>>
    sidekicksByCategoryCache: React.MutableRefObject<Record<string, { data: Sidekick[]; timestamp: number }>>
    renderSkeletonCards: (count: number, isHorizontal?: boolean) => React.ReactNode
    enablePerformanceLogs?: boolean
}

const SidekickSearchPanel: React.FC<SidekickSearchPanelProps> = ({
    sidekicks,
    allCategories,
    isLoading,
    user,
    activeFilterCategory,
    setActiveFilterCategory,
    favorites,
    toggleFavorite,
    navigate,
    handleSidekickSelect,
    setSelectedTemplateId,
    setIsMarketplaceDialogOpen,
    sidekicksByCategoryCache,
    renderSkeletonCards,
    enablePerformanceLogs = false
}) => {
    // Use search hook
    const { searchInputValue, searchTerm, searchbarRef, fuse, searchResults, handleSearchChange, clearSearchField } = useSidekickSearch({
        sidekicks: sidekicks || [],
        enableLogs: enablePerformanceLogs,
        initialTab: 'all'
    })

    // Improved memoized search results with proper typing
    const filteredSearchResults = React.useMemo(() => {
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

    return (
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
                            <Button onClick={clearSearchField} style={{ position: 'absolute', right: 10, padding: 0, minWidth: 'auto' }}>
                                <CancelIcon color='action' />
                            </Button>
                        )
                    }}
                />
            </Box>

            {searchTerm && fuse ? (
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
            ) : null}
        </>
    )
}

export default SidekickSearchPanel
