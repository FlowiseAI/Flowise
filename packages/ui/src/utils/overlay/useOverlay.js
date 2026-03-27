import { createContext, useContext } from 'react'

const initialValue = {
    start: () => {},
    next: () => {},
    prev: () => {},
    /**
     * Onboarding guide.
     *
     * Go to a specific step by ID. The step must be part of the current steps provided in `start()`
     */
    goTo: () => {},
    end: () => {},
    getCurrentStep: () => null,
    /**
     * Determine if the guide is currently active. This can be used to conditionally render components related to the guide (e.g. tooltips, highlights, etc.)
     * @returns {boolean} True if the guide is active, false otherwise
     */
    isActive: () => false,
    /**
     * Determine if the current step is the first step. This can be used to conditionally render sparkle guide buttons on the first step of the guide.
     */
    isFirstStep: () => false
}

// Overlay controller context
export const OverlayContext = createContext(initialValue)

// Hook to use overlay controller
export function useOverlay() {
    const ctx = useContext(OverlayContext)
    if (!ctx) {
        throw new Error('useOverlay must be used within OverlayProvider')
    }
    return ctx
}
