import type { ReactElement } from 'react'

import { ThemeProvider } from '@mui/material/styles'
import { fireEvent, render, screen } from '@testing-library/react'

import { createObserveTheme } from '@/core/theme'

import type { HumanInputState } from '../hooks/useHumanInput'

import { HitlPanel } from './HitlPanel'

function renderWithTheme(ui: ReactElement) {
    return render(<ThemeProvider theme={createObserveTheme(false)}>{ui}</ThemeProvider>)
}

function makeState(overrides: Partial<HumanInputState> = {}): HumanInputState {
    return {
        isSubmitting: false,
        submitError: null,
        feedbackOpen: false,
        feedbackText: '',
        setFeedbackText: jest.fn(),
        dismissError: jest.fn(),
        handleProceed: jest.fn(),
        handleReject: jest.fn(),
        cancelFeedbackDialog: jest.fn(),
        submitFeedback: jest.fn(),
        ...overrides
    }
}

describe('HitlPanel', () => {
    describe('action bar gating', () => {
        it('hides the floating action bar when show=false', () => {
            renderWithTheme(<HitlPanel show={false} state={makeState()} />)
            expect(screen.queryByTestId('hitl-action-bar')).not.toBeInTheDocument()
            expect(screen.queryByRole('button', { name: 'Proceed' })).not.toBeInTheDocument()
        })

        it('renders Proceed + Reject buttons when show=true', () => {
            renderWithTheme(<HitlPanel show state={makeState()} />)
            expect(screen.getByTestId('hitl-action-bar')).toBeInTheDocument()
            expect(screen.getByRole('button', { name: 'Proceed' })).toBeEnabled()
            expect(screen.getByRole('button', { name: 'Reject' })).toBeEnabled()
        })

        it('disables both buttons while a submission is in flight', () => {
            // The loading-overlay Dialog sets aria-hidden on its siblings, so
            // the role-based query needs `hidden: true` to reach the bar.
            renderWithTheme(<HitlPanel show state={makeState({ isSubmitting: true })} />)
            expect(screen.getByRole('button', { name: 'Proceed', hidden: true })).toBeDisabled()
            expect(screen.getByRole('button', { name: 'Reject', hidden: true })).toBeDisabled()
        })

        it('fires handleProceed and handleReject when their buttons are clicked', () => {
            const state = makeState()
            renderWithTheme(<HitlPanel show state={state} />)
            fireEvent.click(screen.getByRole('button', { name: 'Proceed' }))
            fireEvent.click(screen.getByRole('button', { name: 'Reject' }))
            expect(state.handleProceed).toHaveBeenCalledTimes(1)
            expect(state.handleReject).toHaveBeenCalledTimes(1)
        })
    })

    describe('inline error', () => {
        it('hides the Alert when submitError is null', () => {
            renderWithTheme(<HitlPanel show state={makeState()} />)
            expect(screen.queryByRole('alert')).not.toBeInTheDocument()
        })

        it('renders the Alert with the error message when submitError is set', () => {
            renderWithTheme(<HitlPanel show state={makeState({ submitError: 'Network down' })} />)
            expect(screen.getByRole('alert')).toHaveTextContent('Network down')
        })

        it('fires dismissError when the Alert close button is clicked', () => {
            const state = makeState({ submitError: 'Boom' })
            renderWithTheme(<HitlPanel show state={state} />)
            fireEvent.click(screen.getByRole('button', { name: /close/i }))
            expect(state.dismissError).toHaveBeenCalledTimes(1)
        })

        it('does not render the Alert when show=false even if submitError is set', () => {
            renderWithTheme(<HitlPanel show={false} state={makeState({ submitError: 'X' })} />)
            expect(screen.queryByRole('alert')).not.toBeInTheDocument()
        })
    })

    describe('feedback dialog', () => {
        it('does not render the dialog when feedbackOpen=false', () => {
            renderWithTheme(<HitlPanel show state={makeState()} />)
            expect(screen.queryByText('Provide Feedback')).not.toBeInTheDocument()
        })

        it('renders the dialog with the textarea preloaded with feedbackText', () => {
            renderWithTheme(<HitlPanel show state={makeState({ feedbackOpen: true, feedbackText: 'draft' })} />)
            expect(screen.getByText('Provide Feedback')).toBeInTheDocument()
            expect(screen.getByLabelText('Feedback')).toHaveValue('draft')
        })

        it('fires setFeedbackText with the new value when the user types', () => {
            const state = makeState({ feedbackOpen: true })
            renderWithTheme(<HitlPanel show state={state} />)
            fireEvent.change(screen.getByLabelText('Feedback'), { target: { value: 'looks good' } })
            expect(state.setFeedbackText).toHaveBeenCalledWith('looks good')
        })

        it('fires cancelFeedbackDialog when Cancel is clicked', () => {
            const state = makeState({ feedbackOpen: true })
            renderWithTheme(<HitlPanel show state={state} />)
            fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))
            expect(state.cancelFeedbackDialog).toHaveBeenCalledTimes(1)
        })

        it('fires submitFeedback when Submit is clicked', () => {
            const state = makeState({ feedbackOpen: true })
            renderWithTheme(<HitlPanel show state={state} />)
            fireEvent.click(screen.getByRole('button', { name: 'Submit' }))
            expect(state.submitFeedback).toHaveBeenCalledTimes(1)
        })

        it('disables the textarea + Cancel + Submit while submitting', () => {
            // The loading-overlay Dialog opens above the feedback dialog and
            // sets aria-hidden on siblings — `hidden: true` reaches the
            // already-mounted feedback dialog buttons.
            renderWithTheme(<HitlPanel show state={makeState({ feedbackOpen: true, isSubmitting: true })} />)
            expect(screen.getByLabelText('Feedback', { selector: 'textarea' })).toBeDisabled()
            expect(screen.getByRole('button', { name: 'Cancel', hidden: true })).toBeDisabled()
            expect(screen.getByRole('button', { name: 'Submit', hidden: true })).toBeDisabled()
        })

        it('mounts the dialog regardless of show (dialog only opens via the bar, but stays mounted)', () => {
            // show=false hides the bar, but if a parent keeps state.feedbackOpen=true
            // (e.g. preserving state across visibility changes), the dialog renders.
            renderWithTheme(<HitlPanel show={false} state={makeState({ feedbackOpen: true })} />)
            expect(screen.getByText('Provide Feedback')).toBeInTheDocument()
        })
    })

    describe('loading overlay', () => {
        it('does not render the overlay when isSubmitting=false', () => {
            renderWithTheme(<HitlPanel show state={makeState()} />)
            expect(screen.queryByLabelText('Submitting response')).not.toBeInTheDocument()
        })

        it('renders the overlay with progress + label when isSubmitting=true', () => {
            renderWithTheme(<HitlPanel show state={makeState({ isSubmitting: true })} />)
            expect(screen.getByLabelText('Submitting response')).toBeInTheDocument()
            expect(screen.getByText('Submitting response...')).toBeInTheDocument()
        })

        it('renders the overlay even when show=false (submission can outlive the gating window)', () => {
            renderWithTheme(<HitlPanel show={false} state={makeState({ isSubmitting: true })} />)
            expect(screen.getByLabelText('Submitting response')).toBeInTheDocument()
        })
    })
})
