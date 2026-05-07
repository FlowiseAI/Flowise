import { render, screen } from '@testing-library/react'

import type { ExecutionStatus } from '@/core/types'

import { NodeStatusIndicator, NodeWarningIndicator } from './NodeStatusIndicator'

// --- Mocks ---

jest.mock('@mui/material/styles', () => ({
    useTheme: () => ({
        palette: {
            error: { dark: '#b71c1c', main: '#d32f2f' },
            warning: { dark: '#e65100' },
            success: { dark: '#1b5e20' },
            info: { main: '#0288d1' },
            primary: { dark: '#1565c0' }
        }
    })
}))

jest.mock('@mui/material', () => ({
    Avatar: ({ sx, children }: { sx?: Record<string, unknown>; children: React.ReactNode }) => (
        <div data-testid='avatar' data-bg={String(sx?.background ?? '')}>
            {children}
        </div>
    ),
    Tooltip: ({ children, title }: { children: React.ReactNode; title: string }) => (
        <div data-tooltip-title={String(title ?? '')}>{children}</div>
    )
}))

jest.mock('@mui/icons-material/Cancel', () => ({ __esModule: true, default: () => <svg data-testid='icon-cancel' /> }))
jest.mock('@mui/icons-material/StopCircle', () => ({ __esModule: true, default: () => <svg data-testid='icon-stop-circle' /> }))

jest.mock('@tabler/icons-react', () => ({
    IconLoader: ({ className }: { className?: string }) => <svg data-testid='icon-loader' className={className} />,
    IconExclamationMark: () => <svg data-testid='icon-exclamation' />,
    IconCheck: () => <svg data-testid='icon-check' />,
    IconAlertCircleFilled: ({ color }: { color?: string }) => <svg data-testid='icon-alert-circle' data-color={color} />
}))

// --- Helpers ---

function renderStatus(status?: ExecutionStatus, error?: string) {
    return render(<NodeStatusIndicator status={status} error={error} />)
}

// --- Tests ---

describe('NodeStatusIndicator', () => {
    it('renders nothing when status is undefined', () => {
        const { container } = renderStatus()
        expect(container.firstChild).toBeNull()
    })

    describe('background color', () => {
        it.each<[ExecutionStatus]>([['STOPPED'], ['TERMINATED'], ['WAITING_FOR_INPUT']])(
            'uses a white (transparent) background for %s to match v2 stopped-state style',
            (status) => {
                renderStatus(status)
                expect(screen.getByTestId('avatar')).toHaveAttribute('data-bg', 'white')
            }
        )

        it('uses error.dark background for ERROR', () => {
            renderStatus('ERROR')
            expect(screen.getByTestId('avatar')).toHaveAttribute('data-bg', '#b71c1c')
        })

        it('uses warning.dark background for INPROGRESS', () => {
            renderStatus('INPROGRESS')
            expect(screen.getByTestId('avatar')).toHaveAttribute('data-bg', '#e65100')
        })

        it('uses success.dark background for FINISHED', () => {
            renderStatus('FINISHED')
            expect(screen.getByTestId('avatar')).toHaveAttribute('data-bg', '#1b5e20')
        })
    })

    describe('icon rendering', () => {
        it('renders StopCircleIcon for WAITING_FOR_INPUT (matching v2 human-loop style)', () => {
            renderStatus('WAITING_FOR_INPUT')
            expect(screen.getByTestId('icon-stop-circle')).toBeInTheDocument()
        })

        it('renders StopCircleIcon for STOPPED', () => {
            renderStatus('STOPPED')
            expect(screen.getByTestId('icon-stop-circle')).toBeInTheDocument()
        })

        it('renders CancelIcon for TERMINATED', () => {
            renderStatus('TERMINATED')
            expect(screen.getByTestId('icon-cancel')).toBeInTheDocument()
        })

        it('renders a spinning loader for INPROGRESS', () => {
            renderStatus('INPROGRESS')
            expect(screen.getByTestId('icon-loader')).toHaveClass('spin-animation')
        })

        it('renders a check icon for FINISHED', () => {
            renderStatus('FINISHED')
            expect(screen.getByTestId('icon-check')).toBeInTheDocument()
        })

        it('renders an exclamation icon for ERROR', () => {
            renderStatus('ERROR')
            expect(screen.getByTestId('icon-exclamation')).toBeInTheDocument()
        })
    })

    describe('tooltip title', () => {
        it('shows the error message for ERROR status', () => {
            renderStatus('ERROR', 'API rate limit exceeded')
            expect(screen.getByTestId('avatar').closest('[data-tooltip-title]')).toHaveAttribute(
                'data-tooltip-title',
                'API rate limit exceeded'
            )
        })

        it('falls back to "Error" when ERROR has no message', () => {
            renderStatus('ERROR')
            expect(screen.getByTestId('avatar').closest('[data-tooltip-title]')).toHaveAttribute('data-tooltip-title', 'Error')
        })

        it('shows "Waiting for input" for WAITING_FOR_INPUT', () => {
            renderStatus('WAITING_FOR_INPUT')
            expect(screen.getByTestId('avatar').closest('[data-tooltip-title]')).toHaveAttribute('data-tooltip-title', 'Waiting for input')
        })

        it.each<[ExecutionStatus]>([['FINISHED'], ['STOPPED'], ['TERMINATED'], ['INPROGRESS']])(
            'shows no tooltip text for %s',
            (status) => {
                renderStatus(status)
                expect(screen.getByTestId('avatar').closest('[data-tooltip-title]')).toHaveAttribute('data-tooltip-title', '')
            }
        )
    })
})

describe('NodeWarningIndicator', () => {
    it('renders nothing when message is empty', () => {
        const { container } = render(<NodeWarningIndicator message='' />)
        expect(container.firstChild).toBeNull()
    })

    it('renders the orange alert icon when a warning message is provided', () => {
        render(<NodeWarningIndicator message='Missing required input' />)
        expect(screen.getByTestId('icon-alert-circle')).toHaveAttribute('data-color', 'orange')
    })

    it('renders an avatar container for the warning icon', () => {
        render(<NodeWarningIndicator message='Some warning' />)
        expect(screen.getByTestId('avatar')).toBeInTheDocument()
    })
})
