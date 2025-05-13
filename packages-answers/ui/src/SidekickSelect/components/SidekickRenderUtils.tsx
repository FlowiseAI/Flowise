'use client'
import React from 'react'
import { Box } from '@mui/material'
import { ChevronRight as ChevronRightIcon } from '@mui/icons-material'
import { Sidekick } from '../SidekickSelect.types'
import { UserProfile } from '@auth0/nextjs-auth0/client'
import {
    SkeletonItem,
    CategorySectionContainer,
    CategoryTitle,
    ViewAllButton,
    StyledGrid,
    StyledGridItem,
    SkeletonCard
} from '../StyledComponents'
import SidekickCard from '../SidekickCard'

interface RenderSkeletonCardsProps {
    count: number
    isHorizontal?: boolean
}

export const renderSkeletonCards = ({ count, isHorizontal = true }: RenderSkeletonCardsProps) => {
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

interface RenderFocusedCategoryProps {
    category: string
    getSidekicksByCategory: (category: string) => Sidekick[]
    isLoading: boolean
    allCategories: { top: string[]; more: string[] }
    toggleViewMode: (category: string) => void
    setFocusedCategory: React.Dispatch<React.SetStateAction<string | null>>
    user?: UserProfile
    favorites: Set<string>
    navigate: any
    handleSidekickSelect: (sidekick: Sidekick) => void
    setSelectedTemplateId: React.Dispatch<React.SetStateAction<string | null>>
    setIsMarketplaceDialogOpen: React.Dispatch<React.SetStateAction<boolean>>
    toggleFavorite: (sidekick: Sidekick, e?: React.MouseEvent) => void
}

export const RenderFocusedCategory: React.FC<RenderFocusedCategoryProps> = ({
    category,
    getSidekicksByCategory,
    isLoading,
    allCategories,
    toggleViewMode,
    setFocusedCategory,
    user,
    favorites,
    navigate,
    handleSidekickSelect,
    setSelectedTemplateId,
    setIsMarketplaceDialogOpen,
    toggleFavorite
}) => {
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
                            <Box sx={{ position: 'relative' }}>{renderSkeletonCards({ count: 1, isHorizontal: false })}</Box>
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
}

export default { renderSkeletonCards, RenderFocusedCategory }
