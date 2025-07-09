import { useState, useCallback } from 'react'
import { extractMissingCredentials, updateFlowDataWithCredentials } from '@/utils/flowCredentialsHelper'

/**
 * Custom hook for checking and managing missing credentials in flows
 * @returns {object} Hook interface with methods and state
 */
export const useCredentialChecker = () => {
    const [showCredentialModal, setShowCredentialModal] = useState(false)
    const [missingCredentials, setMissingCredentials] = useState([])
    const [pendingFlowData, setPendingFlowData] = useState(null)
    const [onCredentialsAssigned, setOnCredentialsAssigned] = useState(null)

    /**
     * Check if a flow has missing credentials and show modal if needed
     * @param {string|object} flowData - Flow data to check
     * @param {function} onAssign - Callback when credentials are assigned
     * @returns {boolean} Whether modal was shown
     */
    const checkCredentials = useCallback((flowData, onAssign) => {
        console.log('🔍 checkCredentials called with:', {
            flowDataType: typeof flowData,
            hasOnAssign: !!onAssign,
            currentModalState: showCredentialModal
        })

        try {
            const result = extractMissingCredentials(flowData)
            console.log('🔍 Credential extraction result:', {
                hasCredentials: result.hasCredentials,
                missingCount: result.missingCredentials.length,
                missingTypes: result.missingCredentials.map((c) => c.credentialType)
            })

            if (result.hasCredentials && result.missingCredentials.length > 0) {
                console.log('🚨 Missing credentials detected, showing modal')
                setMissingCredentials(result.missingCredentials)
                setPendingFlowData(flowData)
                setOnCredentialsAssigned(() => onAssign)
                setShowCredentialModal(true)
                return true
            } else {
                console.log('✅ No missing credentials, proceeding directly')
                if (onAssign) {
                    onAssign(flowData, {})
                }
                return false
            }
        } catch (error) {
            console.error('❌ Error checking credentials:', error)
            // Proceed without credentials modal on error
            if (onAssign) {
                onAssign(flowData, {})
            }
            return false
        }
    }, [showCredentialModal])

    /**
     * Handle credential assignments from the modal
     * @param {object} credentialAssignments - Map of node IDs to credential IDs
     */
    const handleAssign = useCallback(
        (credentialAssignments) => {
            console.log('💾 handleAssign called with:', credentialAssignments)

            if (pendingFlowData && onCredentialsAssigned) {
                try {
                    const updatedFlowData = updateFlowDataWithCredentials(pendingFlowData, credentialAssignments)
                    console.log('💾 Calling onCredentialsAssigned callback...')
                    onCredentialsAssigned(updatedFlowData, credentialAssignments)
                } catch (error) {
                    console.error('❌ Error updating flow data with credentials:', error)
                    // Proceed with original flow data
                    onCredentialsAssigned(pendingFlowData, credentialAssignments)
                }
            }

            // Reset state
            console.log('💾 Resetting credential checker state...')
            setShowCredentialModal(false)
            setMissingCredentials([])
            setPendingFlowData(null)
            setOnCredentialsAssigned(null)
        },
        [pendingFlowData, onCredentialsAssigned]
    )

    /**
     * Handle skipping credential assignment
     */
    const handleSkip = useCallback(() => {
        if (pendingFlowData && onCredentialsAssigned) {
            onCredentialsAssigned(pendingFlowData, {})
        }

        // Reset state
        setShowCredentialModal(false)
        setMissingCredentials([])
        setPendingFlowData(null)
        setOnCredentialsAssigned(null)
    }, [pendingFlowData, onCredentialsAssigned])

    /**
     * Handle canceling credential assignment
     */
    const handleCancel = useCallback(() => {
        // Reset state without calling onCredentialsAssigned
        setShowCredentialModal(false)
        setMissingCredentials([])
        setPendingFlowData(null)
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