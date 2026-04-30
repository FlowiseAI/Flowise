import { useState } from 'react'

import type { HumanInputParams } from '@/core/types'

type HumanInputType = 'proceed' | 'reject'

interface UseHumanInputOptions {
    agentflowId: string
    sessionId: string
    nodeId: string
    enableFeedback: boolean
    onHumanInput?: (agentflowId: string, params: HumanInputParams) => Promise<void>
}

export interface HumanInputState {
    isSubmitting: boolean
    submitError: string | null
    feedbackOpen: boolean
    feedbackText: string
    setFeedbackText: (value: string) => void
    dismissError: () => void
    handleProceed: () => void
    handleReject: () => void
    cancelFeedbackDialog: () => void
    submitFeedback: () => void
}

/**
 * Owns the HITL submission lifecycle for `NodeExecutionDetail`:
 *  - Direct submit if `enableFeedback === false`
 *  - Open feedback dialog otherwise (then submit on confirmation)
 *  - Tracks isSubmitting / submitError surfaces for the action bar
 *
 * The hook is a no-op when `onHumanInput` is undefined — callers can still
 * mount the action bar; clicks resolve to nothing.
 */
export function useHumanInput({ agentflowId, sessionId, nodeId, enableFeedback, onHumanInput }: UseHumanInputOptions): HumanInputState {
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [submitError, setSubmitError] = useState<string | null>(null)
    const [feedbackOpen, setFeedbackOpen] = useState(false)
    const [feedbackText, setFeedbackText] = useState('')
    const [pendingType, setPendingType] = useState<HumanInputType | null>(null)

    const submit = async (type: HumanInputType, feedback = '') => {
        if (!onHumanInput) return
        setIsSubmitting(true)
        setSubmitError(null)
        try {
            await onHumanInput(agentflowId, {
                question: feedback || (type === 'proceed' ? 'Proceed' : 'Reject'),
                chatId: sessionId,
                humanInput: { type, startNodeId: nodeId, feedback }
            })
        } catch (err) {
            // Surface the error rather than silently swallowing it. The host
            // app may also show its own snackbar — this in-component message
            // guarantees users see *something* even when no toast handler exists.
            const message = err instanceof Error ? err.message : 'Failed to submit response'
            setSubmitError(message)
        } finally {
            setIsSubmitting(false)
        }
    }

    const requestSubmission = (type: HumanInputType) => {
        if (enableFeedback) {
            setPendingType(type)
            setFeedbackOpen(true)
        } else {
            void submit(type)
        }
    }

    return {
        isSubmitting,
        submitError,
        feedbackOpen,
        feedbackText,
        setFeedbackText,
        dismissError: () => setSubmitError(null),
        handleProceed: () => requestSubmission('proceed'),
        handleReject: () => requestSubmission('reject'),
        cancelFeedbackDialog: () => {
            if (isSubmitting) return
            setFeedbackOpen(false)
            setFeedbackText('')
            setPendingType(null)
        },
        submitFeedback: () => {
            if (!pendingType) return
            const type = pendingType
            const feedback = feedbackText
            setFeedbackOpen(false)
            setFeedbackText('')
            setPendingType(null)
            void submit(type, feedback)
        }
    }
}
