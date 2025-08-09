import { useState, useCallback } from 'react'
import { useSidekickFetcher } from '@ui/SidekickSelect/hooks/useSidekickDetails'

// Minimal interface for credential assignment callback
type CredentialAssignmentCallback = (sidekick: any, assignments: Record<string, string>) => void

// Type for credential assignments map
type CredentialAssignments = Record<string, string>

/**
 * Custom hook for checking and managing missing credentials in sidekicks
 */
export const useCredentialChecker = () => {
    const [showCredentialModal, setShowCredentialModal] = useState<boolean>(false)
    const [missingCredentials, setMissingCredentials] = useState<any[]>([])
    const [onCredentialsAssigned, setOnCredentialsAssigned] = useState<CredentialAssignmentCallback | null>(null)

    const { fetchDetails } = useSidekickFetcher()

    /**
     * Check if a sidekick has missing credentials and show modal if needed
     * @param sidekickId - Sidekick ID to check
     * @param onAssign - Callback when credentials are assigned
     * @param forceShow - Force show modal regardless of missing credentials
     * @returns Whether modal was shown
     */
    const checkCredentials = useCallback(
        async (sidekickId: string, onAssign: CredentialAssignmentCallback, forceShow: boolean = false): Promise<boolean> => {
            try {
                console.log('[useCredentialChecker] checking credentials for sidekick', sidekickId)
                const sidekick = await fetchDetails(sidekickId)

                if (!sidekick) {
                    console.error('Failed to fetch sidekick details')
                    onAssign(null, {})
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
                    onAssign(sidekick, {})
                    return false
                }
            } catch (error) {
                console.error('Error checking credentials:', error)
                // Proceed without credentials modal on error
                onAssign(null, {})
                return false
            }
        },
        [fetchDetails]
    )

    /**
     * Handle credential assignments from the modal
     * @param credentialAssignments - Map of node IDs to credential IDs
     */
    const handleAssign = useCallback(
        (credentialAssignments: CredentialAssignments): void => {
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
    const handleSkip = useCallback((): void => {
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
    const handleCancel = useCallback((): void => {
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
