import { useCallback } from 'react'
import { useDispatch } from 'react-redux'
import { useOverlay } from '@/utils/overlay/useOverlay'
import { COMPLETE_STEP } from '@/store/actions'

/**
 * Hook for guided marketplace exploration - Step by step overlay guide
 * Usage: Call startGuide() when user clicks "Explore Templates" action
 *
 * This provides a tutorial for:
 * 1. Understanding the marketplace layout
 * 2. Searching for specific templates
 * 3. Exploring template details
 * 4. Using templates in flows
 */
const useMarketplaceExplorationGuide = () => {
    const { start } = useOverlay()
    const dispatch = useDispatch()

    /**
     * Start the marketplace exploration guide
     * Shows user how to find and use templates
     * Triggered when navigating to marketplace with startGuide flag
     */
    const startGuide = useCallback(() => {
        const steps = [
            {
                id: 'marketplace:welcome',
                target: '[data-onboarding="view-header-container"]',
                title: '🎨 Welcome to the Marketplace',
                description:
                    'This is where you can discover pre-built templates for chatflows, agent flows, and tools. These templates help you get started quickly without building from scratch.',
                placement: 'bottom',
                padding: 12,
                spotlight: true
            },
            {
                id: 'marketplace:search-intro',
                target: '[data-onboarding="view-header-search-input"]',
                title: '🔍 Search Templates',
                description:
                    'Use the search bar to find specific templates. Try searching for "Conversational Agent" to see templates that help you build conversational AI applications.',
                placement: 'bottom',
                padding: 8,
                spotlight: true
            },
            {
                id: 'marketplace:filter-badge-label',
                target: '[data-onboarding="marketplace-filter-badge-label"]',
                title: '🏷️ Filter by Badge',
                description:
                    'Use badges to quickly identify popular or new templates. This helps you find templates that are trending or recently added.',
                placement: 'bottom',
                padding: 8,
                spotlight: true
            },
            {
                id: 'marketplace:filter-type-label',
                target: '[data-onboarding="marketplace-filter-type-label"]',
                title: '📂 Filter by Type',
                description:
                    'Use the type filter to narrow down templates based on their category, such as Chatflow, AgentflowV2, or Tool.',
                placement: 'bottom',
                padding: 8,
                spotlight: true
            },
            {
                id: 'marketplace:filter-fw-label',
                target: '[data-onboarding="marketplace-filter-fw-label"]',
                title: '⚙️ Filter by Framework',
                description:
                    'Filter templates based on the framework they use, like LangSmith or LlamaIndex. This helps you find templates that fit your preferred development style.',
                placement: 'bottom-left',
                padding: 8,
                spotlight: true
            },
            {
                id: 'marketplace:tabs',
                target: '[data-onboarding="marketplace-tabs"]',
                title: '📑 Browse Sections',
                description:
                    'Switch between "Templates" from the community and "Custom Templates" that you\'ve created. Community templates are ready-to-use examples built by experts.',
                placement: 'bottom',
                padding: 8,
                spotlight: true
            },
            {
                id: 'marketplace:template-card',
                target: '[data-onboarding="marketplace-templates-grid"] > div:first-child',
                title: '📋 Explore Template Details',
                description: 'Click on a template card to view its details and import it to your workspace.',
                placement: 'bottom',
                padding: 8,
                spotlight: true
            },
            {
                id: 'marketplace:selecting-template-card',
                target: '[data-onboarding="marketplace-templates-grid"] > div:first-child',
                title: '📋 Explore Template Details',
                description: 'Select the template card to view its details and import it to your workspace.',
                placement: 'bottom',
                padding: 8,
                spotlight: true,
                hidden: true
            },
            {
                id: 'marketplace:completion',
                target: '[data-onboarding="marketplace-use-template-button"]',
                title: "🎉 You're Ready to Explore!",
                description:
                    'Now you know how to find and use templates from the marketplace. Explore different templates, import ones you like, and customize them for your use cases. Happy building!',
                placement: 'bottom-left',
                padding: 12,
                spotlight: false
            }
        ]

        // Start the guide with completion callback
        start(steps, () => {
            // Mark marketplace exploration as completed in onboarding
            dispatch({ type: COMPLETE_STEP, payload: { step: 'marketplaceExplored' } })
        })
    }, [start, dispatch])

    return {
        startGuide
    }
}

export default useMarketplaceExplorationGuide
