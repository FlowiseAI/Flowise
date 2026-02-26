// Onboarding reducer with localStorage persistence
import { SET_ONBOARDING_STATUS, COMPLETE_STEP, SKIP_ONBOARDING, SET_ONBOARDING_LOADING, SET_ONBOARDING_ERROR } from '@/store/actions'
import { getStateByProgress } from '@/utils/overlay/onboarding'
import { ONBOARDING_STORAGE_KEY } from '@/api/onboarding'

// ==============================|| ONBOARDING REDUCER ||============================== //

// Load initial state from localStorage
const loadFromStorage = () => {
    try {
        const stored = localStorage.getItem(ONBOARDING_STORAGE_KEY)
        if (stored) {
            return JSON.parse(stored)
        }
    } catch (error) {
        console.error('Failed to load onboarding state from localStorage:', error)
    }
    return null
}

const initialState = loadFromStorage() || {
    // State machine
    state: 'NOT_STARTED',

    // Progress
    progress: {
        chatflowCreated: false,
        agentFlowCreated: false,
        documentStoreAdded: false,
        marketplaceExplored: false
    },

    // UI state
    showWelcomePage: false
}

// Save state to localStorage
const saveToStorage = (state) => {
    try {
        localStorage.setItem(ONBOARDING_STORAGE_KEY, JSON.stringify(state))
    } catch (error) {
        console.error('Failed to save onboarding state to localStorage:', error)
    }
}

const onboardingReducer = (state = initialState, action) => {
    let newState = state

    switch (action.type) {
        case SET_ONBOARDING_STATUS: {
            const { data } = action.payload
            newState = {
                ...state,
                state: data.state,
                progress: data.progress || state.progress,
                // Update UI flags based on state
                showWelcomePage: data.state === 'NOT_STARTED' || data.state === 'IN_PROGRESS'
            }
            break
        }

        case COMPLETE_STEP: {
            const { step } = action.payload
            if (Object.prototype.hasOwnProperty.call(state.progress, step)) {
                const updatedProgress = {
                    ...state.progress,
                    [step]: true
                }
                const onboardingState = getStateByProgress(updatedProgress)
                newState = {
                    ...state,
                    progress: updatedProgress,
                    state: onboardingState,
                    showWelcomePage: onboardingState === 'NOT_STARTED' || onboardingState === 'IN_PROGRESS'
                }
            }
            break
        }

        case SKIP_ONBOARDING:
            newState = {
                ...state,
                state: 'SKIPPED',
                showWelcomePage: false
            }
            break

        case SET_ONBOARDING_LOADING:
            newState = {
                ...state,
                loading: action.payload
            }
            break

        case SET_ONBOARDING_ERROR:
            newState = {
                ...state,
                error: action.payload
            }
            break

        default:
            newState = state
    }

    // Save to localStorage on every state change
    if (newState !== state) {
        saveToStorage(newState)
    }

    return newState
}

export default onboardingReducer
