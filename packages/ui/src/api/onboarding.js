import { getStateByProgress } from '../utils/overlay/onboarding'

// localStorage-based API client for onboarding
// This will be replaced with real API calls in the future

export const ONBOARDING_STORAGE_KEY = 'onboarding'

// Get onboarding status
const getStatus = () => {
    try {
        const stored = localStorage.getItem(ONBOARDING_STORAGE_KEY)
        if (stored) {
            const data = JSON.parse(stored)
            const state = getStateByProgress(data.progress)
            return {
                success: true,
                data: {
                    ...data,
                    state
                }
            }
        }

        // Return default state for new users
        return {
            success: true,
            data: {
                state: 'NOT_STARTED',
                showWelcomePage: true,
                progress: {
                    chatflowCreated: false,
                    agentFlowCreated: false,
                    documentStoreAdded: false,
                    marketplaceExplored: false
                }
            }
        }
    } catch (error) {
        console.error('Failed to get onboarding status:', error)
        throw error
    }
}

const onboardingApi = {
    getStatus
}

export default onboardingApi
