import { act, renderHook } from '@testing-library/react'

import { useHumanInput } from './useHumanInput'

const baseOpts = {
    agentflowId: 'flow-1',
    sessionId: 'sess-1',
    nodeId: 'human-1',
    enableFeedback: false
}

describe('useHumanInput', () => {
    describe('direct submit (enableFeedback=false)', () => {
        it('calls onHumanInput with type=proceed and the synthesized question', async () => {
            const onHumanInput = jest.fn().mockResolvedValue(undefined)
            const { result } = renderHook(() => useHumanInput({ ...baseOpts, onHumanInput }))
            await act(async () => {
                result.current.handleProceed()
            })
            expect(onHumanInput).toHaveBeenCalledWith('flow-1', {
                question: 'Proceed',
                chatId: 'sess-1',
                humanInput: { type: 'proceed', startNodeId: 'human-1', feedback: '' }
            })
        })

        it('calls onHumanInput with type=reject for handleReject', async () => {
            const onHumanInput = jest.fn().mockResolvedValue(undefined)
            const { result } = renderHook(() => useHumanInput({ ...baseOpts, onHumanInput }))
            await act(async () => {
                result.current.handleReject()
            })
            expect(onHumanInput).toHaveBeenCalledWith(
                'flow-1',
                expect.objectContaining({ humanInput: expect.objectContaining({ type: 'reject' }) })
            )
        })

        it('does not open the feedback dialog when enableFeedback=false', async () => {
            const onHumanInput = jest.fn().mockResolvedValue(undefined)
            const { result } = renderHook(() => useHumanInput({ ...baseOpts, onHumanInput }))
            // Async act so the post-await `setIsSubmitting(false)` in `submit`'s
            // finally block flushes inside the boundary.
            await act(async () => {
                result.current.handleProceed()
            })
            expect(result.current.feedbackOpen).toBe(false)
        })

        it('is a no-op when onHumanInput is not provided', () => {
            const { result } = renderHook(() => useHumanInput({ ...baseOpts, onHumanInput: undefined }))
            // Should not throw — the hook simply ignores the click.
            expect(() => {
                act(() => {
                    result.current.handleProceed()
                })
            }).not.toThrow()
        })
    })

    describe('feedback dialog (enableFeedback=true)', () => {
        it('opens the dialog instead of submitting on handleProceed', () => {
            const onHumanInput = jest.fn().mockResolvedValue(undefined)
            const { result } = renderHook(() => useHumanInput({ ...baseOpts, enableFeedback: true, onHumanInput }))
            act(() => {
                result.current.handleProceed()
            })
            expect(result.current.feedbackOpen).toBe(true)
            expect(onHumanInput).not.toHaveBeenCalled()
        })

        it('submitFeedback sends the typed feedback as both question and humanInput.feedback', async () => {
            const onHumanInput = jest.fn().mockResolvedValue(undefined)
            const { result } = renderHook(() => useHumanInput({ ...baseOpts, enableFeedback: true, onHumanInput }))
            act(() => {
                result.current.handleProceed()
                result.current.setFeedbackText('Looks good')
            })
            await act(async () => {
                result.current.submitFeedback()
            })
            expect(onHumanInput).toHaveBeenCalledWith('flow-1', {
                question: 'Looks good',
                chatId: 'sess-1',
                humanInput: { type: 'proceed', startNodeId: 'human-1', feedback: 'Looks good' }
            })
            // After submission the dialog closes and the text is cleared.
            expect(result.current.feedbackOpen).toBe(false)
            expect(result.current.feedbackText).toBe('')
        })

        it('routes Reject through the dialog when enableFeedback=true', async () => {
            const onHumanInput = jest.fn().mockResolvedValue(undefined)
            const { result } = renderHook(() => useHumanInput({ ...baseOpts, enableFeedback: true, onHumanInput }))
            act(() => {
                result.current.handleReject()
                result.current.setFeedbackText('Wrong answer')
            })
            await act(async () => {
                result.current.submitFeedback()
            })
            expect(onHumanInput).toHaveBeenCalledWith(
                'flow-1',
                expect.objectContaining({
                    question: 'Wrong answer',
                    humanInput: expect.objectContaining({ type: 'reject', feedback: 'Wrong answer' })
                })
            )
        })

        it('cancelFeedbackDialog closes without submitting', () => {
            const onHumanInput = jest.fn().mockResolvedValue(undefined)
            const { result } = renderHook(() => useHumanInput({ ...baseOpts, enableFeedback: true, onHumanInput }))
            act(() => {
                result.current.handleProceed()
                result.current.setFeedbackText('changed my mind')
                result.current.cancelFeedbackDialog()
            })
            expect(result.current.feedbackOpen).toBe(false)
            expect(result.current.feedbackText).toBe('')
            expect(onHumanInput).not.toHaveBeenCalled()
        })

        it('submitFeedback is a no-op when no pending type exists', () => {
            // Calling submitFeedback before handleProceed/handleReject should
            // not invoke onHumanInput — there's nothing to submit.
            const onHumanInput = jest.fn().mockResolvedValue(undefined)
            const { result } = renderHook(() => useHumanInput({ ...baseOpts, enableFeedback: true, onHumanInput }))
            act(() => {
                result.current.submitFeedback()
            })
            expect(onHumanInput).not.toHaveBeenCalled()
        })
    })

    describe('error surfacing', () => {
        it('captures Error.message into submitError when the callback rejects', async () => {
            const onHumanInput = jest.fn().mockRejectedValue(new Error('Network down'))
            const { result } = renderHook(() => useHumanInput({ ...baseOpts, onHumanInput }))
            await act(async () => {
                result.current.handleProceed()
            })
            expect(result.current.submitError).toBe('Network down')
            expect(result.current.isSubmitting).toBe(false)
        })

        it('falls back to a generic message for non-Error rejections', async () => {
            const onHumanInput = jest.fn().mockRejectedValue('something went wrong')
            const { result } = renderHook(() => useHumanInput({ ...baseOpts, onHumanInput }))
            await act(async () => {
                result.current.handleProceed()
            })
            expect(result.current.submitError).toBe('Failed to submit response')
        })

        it('dismissError clears the inline error', async () => {
            const onHumanInput = jest.fn().mockRejectedValue(new Error('Network down'))
            const { result } = renderHook(() => useHumanInput({ ...baseOpts, onHumanInput }))
            await act(async () => {
                result.current.handleProceed()
            })
            expect(result.current.submitError).toBe('Network down')
            act(() => {
                result.current.dismissError()
            })
            expect(result.current.submitError).toBeNull()
        })

        it('clears any prior error when a new submission starts', async () => {
            const onHumanInput = jest.fn().mockRejectedValueOnce(new Error('first failure')).mockResolvedValueOnce(undefined)
            const { result } = renderHook(() => useHumanInput({ ...baseOpts, onHumanInput }))
            await act(async () => {
                result.current.handleProceed()
            })
            expect(result.current.submitError).toBe('first failure')
            await act(async () => {
                result.current.handleProceed()
            })
            expect(result.current.submitError).toBeNull()
        })
    })
})
