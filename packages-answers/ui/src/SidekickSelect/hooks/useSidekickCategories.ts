'use client'
import { useState, useCallback, useMemo } from 'react'
import { Sidekick } from '../SidekickSelect.types'

interface UseSidekickCategoriesProps {
    combinedSidekicks: Sidekick[]
    favorites: Set<string>
    enablePerformanceLogs?: boolean
    sidekicksByCategoryCache: React.MutableRefObject<Record<string, { data: Sidekick[]; timestamp: number }>>
    perfLog: (message: string, ...args: any[]) => void
}

interface UseSidekickCategoriesResult {
    expandedCategory: string | null
    setExpandedCategory: React.Dispatch<React.SetStateAction<string | null>>
    focusedCategory: string | null
    setFocusedCategory: React.Dispatch<React.SetStateAction<string | null>>
    viewMode: Record<string, 'horizontal' | 'grid'>
    setViewMode: React.Dispatch<React.SetStateAction<Record<string, 'horizontal' | 'grid'>>>
    activeFilterCategory: Record<string, string>
    setActiveFilterCategory: React.Dispatch<React.SetStateAction<Record<string, string>>>
    toggleViewMode: (category: string) => void
    getSidekicksByCategory: (category: string) => Sidekick[]
}

const useSidekickCategories = ({
    combinedSidekicks,
    favorites,
    enablePerformanceLogs = false,
    sidekicksByCategoryCache,
    perfLog
}: UseSidekickCategoriesProps): UseSidekickCategoriesResult => {
    // Category state management
    const [expandedCategory, setExpandedCategory] = useState<string | null>(null)
    const [focusedCategory, setFocusedCategory] = useState<string | null>(null)
    const [viewMode, setViewMode] = useState<Record<string, 'horizontal' | 'grid'>>({})
    const [activeFilterCategory, setActiveFilterCategory] = useState<Record<string, string>>({})

    // Track category render counts to identify excessive rerenders
    const categoryRenderCountsRef = useMemo(() => ({ current: {} as Record<string, number> }), [])

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
        [combinedSidekicks, favorites, perfLog, sidekicksByCategoryCache, enablePerformanceLogs, categoryRenderCountsRef]
    )

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

    return {
        expandedCategory,
        setExpandedCategory,
        focusedCategory,
        setFocusedCategory,
        viewMode,
        setViewMode,
        activeFilterCategory,
        setActiveFilterCategory,
        toggleViewMode,
        getSidekicksByCategory
    }
}

export default useSidekickCategories
