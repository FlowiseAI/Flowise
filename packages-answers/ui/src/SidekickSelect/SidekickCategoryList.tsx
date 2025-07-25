'use client'
import React from 'react'
import { Box, Typography, Button } from '@mui/material'
import { UserProfile } from '@auth0/nextjs-auth0/client'
import { Sidekick } from './SidekickSelect.types'
import { CategorySectionn } from './SidekickCategorySection'

interface SidekickCategoryListProps {
    isLoading: boolean
    combinedSidekicks: Sidekick[]
    allCategories: { top: string[]; more: string[] }
    getSidekicksByCategory: (category: string) => Sidekick[]
    expandedCategory: string | null
    viewMode: Record<string, 'horizontal' | 'grid'>
    toggleViewMode: (category: string) => void
    renderSkeletonCards: (count: number, isHorizontal?: boolean) => React.ReactNode
    handleSidekickSelect: (sidekick: Sidekick) => void
    activeFilterCategory: Record<string, string>
    favorites: Set<string>
    toggleFavorite: (sidekick: Sidekick, e?: React.MouseEvent) => void
    navigate: any
    setExpandedCategory: React.Dispatch<React.SetStateAction<string | null>>
    setSelectedTemplateId: React.Dispatch<React.SetStateAction<string | null>>
    setIsMarketplaceDialogOpen: React.Dispatch<React.SetStateAction<boolean>>
    setViewMode: React.Dispatch<React.SetStateAction<Record<string, 'horizontal' | 'grid'>>>
    setActiveFilterCategory: React.Dispatch<React.SetStateAction<Record<string, string>>>
    sidekicksByCategoryCache: React.MutableRefObject<Record<string, { data: Sidekick[]; timestamp: number }>>
    user?: UserProfile
    handleCreateNewSidekick: () => void
}

const SidekickCategoryList: React.FC<SidekickCategoryListProps> = ({
    isLoading,
    combinedSidekicks,
    allCategories,
    getSidekicksByCategory,
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
    sidekicksByCategoryCache,
    user,
    handleCreateNewSidekick
}) => {
    if (isLoading) {
        return (
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
        )
    } else if (combinedSidekicks.length === 0) {
        return (
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
        )
    }

    return (
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
    )
}

export default SidekickCategoryList
