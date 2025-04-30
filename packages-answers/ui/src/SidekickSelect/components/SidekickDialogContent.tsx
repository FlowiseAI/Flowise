'use client'
import React, { useMemo } from 'react'
import { UserProfile } from '@auth0/nextjs-auth0/client'
import { Sidekick } from '../SidekickSelect.types'
import { NavigateFunction } from '@/utils/navigation'
import SidekickSearchPanel from '../SidekickSearchPanel'
import SidekickCategoryList from '../SidekickCategoryList'
import dynamic from 'next/dynamic'
import { RenderFocusedCategory, renderSkeletonCards } from './SidekickRenderUtils'

// Add marketplace dialog type definition
interface MarketplaceDialogProps {
    open: boolean
    onClose: () => void
    templateId: string | null
    onUse: (sidekick: Sidekick) => void
}

const MarketplaceLandingDialog = dynamic(() => import('@/views/chatflows/MarketplaceLandingDialog'), { ssr: false })
const MarketplaceDialogComponent = MarketplaceLandingDialog as React.ComponentType<MarketplaceDialogProps>

interface SidekickDialogContentProps {
    user?: UserProfile
    focusedCategory: string | null
    isLoading: boolean
    combinedSidekicks: Sidekick[]
    allCategories: { top: string[]; more: string[] }
    getSidekicksByCategory: (category: string) => Sidekick[]
    expandedCategory: string | null
    viewMode: Record<string, 'horizontal' | 'grid'>
    toggleViewMode: (category: string) => void
    activeFilterCategory: Record<string, string>
    setActiveFilterCategory: React.Dispatch<React.SetStateAction<Record<string, string>>>
    favorites: Set<string>
    toggleFavorite: (sidekick: Sidekick, e?: React.MouseEvent) => void
    navigate: NavigateFunction
    handleSidekickSelect: (sidekick: Sidekick) => void
    isMarketplaceDialogOpen: boolean
    setIsMarketplaceDialogOpen: React.Dispatch<React.SetStateAction<boolean>>
    selectedTemplateId: string | null
    setSelectedTemplateId: React.Dispatch<React.SetStateAction<string | null>>
    setExpandedCategory: React.Dispatch<React.SetStateAction<string | null>>
    setFocusedCategory: React.Dispatch<React.SetStateAction<string | null>>
    setViewMode: React.Dispatch<React.SetStateAction<Record<string, 'horizontal' | 'grid'>>>
    sidekicksByCategoryCache: React.MutableRefObject<Record<string, { data: Sidekick[]; timestamp: number }>>
    handleCreateNewSidekick: () => void
    enablePerformanceLogs?: boolean
    perfLog?: (message: string, ...args: any[]) => void
}

const SidekickDialogContent: React.FC<SidekickDialogContentProps> = ({
    user,
    focusedCategory,
    isLoading,
    combinedSidekicks,
    allCategories,
    getSidekicksByCategory,
    expandedCategory,
    viewMode,
    toggleViewMode,
    activeFilterCategory,
    setActiveFilterCategory,
    favorites,
    toggleFavorite,
    navigate,
    handleSidekickSelect,
    isMarketplaceDialogOpen,
    setIsMarketplaceDialogOpen,
    selectedTemplateId,
    setSelectedTemplateId,
    setExpandedCategory,
    setFocusedCategory,
    setViewMode,
    sidekicksByCategoryCache,
    handleCreateNewSidekick,
    enablePerformanceLogs = false,
    perfLog = () => {}
}) => {
    // Optimize the content function to reduce excessive re-renders
    const content = useMemo(
        () => {
            const startTime = enablePerformanceLogs ? performance.now() : 0

            perfLog(`Rendering main content`)

            const result = (
                <>
                    <SidekickSearchPanel
                        sidekicks={combinedSidekicks}
                        allCategories={allCategories}
                        isLoading={isLoading}
                        user={user}
                        activeFilterCategory={activeFilterCategory}
                        setActiveFilterCategory={setActiveFilterCategory}
                        favorites={favorites}
                        toggleFavorite={toggleFavorite}
                        navigate={navigate}
                        handleSidekickSelect={handleSidekickSelect}
                        setSelectedTemplateId={setSelectedTemplateId}
                        setIsMarketplaceDialogOpen={setIsMarketplaceDialogOpen}
                        sidekicksByCategoryCache={sidekicksByCategoryCache}
                        renderSkeletonCards={(count) => renderSkeletonCards({ count })}
                        enablePerformanceLogs={enablePerformanceLogs}
                    />

                    {focusedCategory ? (
                        // When a category is focused (Show All was clicked), only show that category
                        <RenderFocusedCategory
                            category={focusedCategory}
                            getSidekicksByCategory={getSidekicksByCategory}
                            isLoading={isLoading}
                            allCategories={allCategories}
                            toggleViewMode={toggleViewMode}
                            setFocusedCategory={setFocusedCategory}
                            user={user}
                            favorites={favorites}
                            navigate={navigate}
                            handleSidekickSelect={handleSidekickSelect}
                            setSelectedTemplateId={setSelectedTemplateId}
                            setIsMarketplaceDialogOpen={setIsMarketplaceDialogOpen}
                            toggleFavorite={toggleFavorite}
                        />
                    ) : (
                        // Regular category sections
                        <SidekickCategoryList
                            isLoading={isLoading}
                            combinedSidekicks={combinedSidekicks}
                            allCategories={allCategories}
                            getSidekicksByCategory={getSidekicksByCategory}
                            expandedCategory={expandedCategory}
                            viewMode={viewMode}
                            toggleViewMode={toggleViewMode}
                            renderSkeletonCards={(count) => renderSkeletonCards({ count })}
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
                            user={user}
                            handleCreateNewSidekick={handleCreateNewSidekick}
                        />
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
                perfLog(`Content rendering completed in ${(endTime - startTime).toFixed(2)}ms`)
            }

            return result
        },
        // Strictly limit dependencies to reduce re-renders
        [
            focusedCategory,
            isLoading,
            allCategories.top,
            allCategories.more.length,
            isMarketplaceDialogOpen,
            selectedTemplateId,
            combinedSidekicks.length,
            combinedSidekicks,

            // Functions
            getSidekicksByCategory,
            handleCreateNewSidekick,
            handleSidekickSelect,

            // Utils
            perfLog,
            expandedCategory,

            // State
            activeFilterCategory,
            viewMode,

            // Props
            user,
            favorites,
            toggleFavorite,
            navigate,

            // Setters
            setFocusedCategory,
            setExpandedCategory,
            setSelectedTemplateId,
            setIsMarketplaceDialogOpen,
            setViewMode,
            setActiveFilterCategory,

            // Cache
            sidekicksByCategoryCache,

            // Config
            enablePerformanceLogs
        ]
    )

    return content
}

export default SidekickDialogContent
