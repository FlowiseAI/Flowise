import { useState, useCallback } from 'react'
import { useSidekickFetcher } from '@ui/SidekickSelect/hooks/useSidekickDetails'

/**
 * Custom hook for checking and managing missing credentials in sidekicks
 */
export const useCredentialChecker = () => {
    const [showCredentialModal, setShowCredentialModal] = useState(false)
    const [missingCredentials, setMissingCredentials] = useState([])
    const [onCredentialsAssigned, setOnCredentialsAssigned] = useState(null)

    const { fetchDetails } = useSidekickFetcher()

    /**
     * Check if a sidekick has missing credentials and show modal if needed
     * @param {string} sidekickId - Sidekick ID to check
     * @param {function} onAssign - Callback when credentials are assigned
     * @param {boolean} forceShow - Force show modal regardless of missing credentials
     * @returns {Promise<boolean>} Whether modal was shown
     */
    const checkCredentials = useCallback(
        async (sidekickId, onAssign, forceShow = false) => {
            try {
                console.log('[useCredentialChecker] checking credentials for sidekick', sidekickId)
                const sidekick = await fetchDetails(sidekickId)

                if (!sidekick) {
                    console.error('Failed to fetch sidekick details')
                    if (onAssign) {
                        onAssign(null, {})
                    }
                    return false
                }

                const credentialsToShow = sidekick.credentialsToShow || []
                const needsSetup = sidekick.needsSetup || false

                // Show modal if forceShow is true OR if there are missing credentials
                if (forceShow || (needsSetup && credentialsToShow.length > 0)) {
                    setMissingCredentials(credentialsToShow)
                    setOnCredentialsAssigned(() => onAssign)
                    setShowCredentialModal(true)
                    return true
                } else {
                    if (onAssign) {
                        onAssign(sidekick, {})
                    }
                    return false
                }
            } catch (error) {
                console.error('Error checking credentials:', error)
                // Proceed without credentials modal on error
                if (onAssign) {
                    onAssign(null, {})
                }
                return false
            }
        },
        [fetchDetails]
    )

    /**
     * Handle credential assignments from the modal
     * @param {object} credentialAssignments - Map of node IDs to credential IDs
     */
    const handleAssign = useCallback(
        (credentialAssignments) => {
            if (onCredentialsAssigned) {
                onCredentialsAssigned(null, credentialAssignments)
            }

            // Reset state
            setShowCredentialModal(false)
            setMissingCredentials([])
            setOnCredentialsAssigned(null)
        },
        [onCredentialsAssigned]
    )

    /**
     * Handle skipping credential assignment
     */
    const handleSkip = useCallback(() => {
        if (onCredentialsAssigned) {
            onCredentialsAssigned(null, {})
        }

        // Reset state
        setShowCredentialModal(false)
        setMissingCredentials([])
        setOnCredentialsAssigned(null)
    }, [onCredentialsAssigned])

    /**
     * Handle canceling credential assignment
     */
    const handleCancel = useCallback(() => {
        // Reset state without calling onCredentialsAssigned
        setShowCredentialModal(false)
        setMissingCredentials([])
        setOnCredentialsAssigned(null)
    }, [])

    return {
        showCredentialModal,
        missingCredentials,
        checkCredentials,
        handleAssign,
        handleSkip,
        handleCancel
    }
}
