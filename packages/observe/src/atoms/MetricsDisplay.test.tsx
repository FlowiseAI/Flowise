import type { ReactElement } from 'react'

import { ThemeProvider } from '@mui/material/styles'
import { render, screen } from '@testing-library/react'

import { createObserveTheme } from '@/core/theme'

import { MetricsDisplay } from './MetricsDisplay'

function renderWithTheme(ui: ReactElement) {
    return render(<ThemeProvider theme={createObserveTheme(false)}>{ui}</ThemeProvider>)
}

describe('MetricsDisplay', () => {
    it('renders nothing when output is undefined', () => {
        const { container } = renderWithTheme(<MetricsDisplay output={undefined} />)
        expect(container.firstChild).toBeNull()
    })

    it('renders nothing when all metric values are absent', () => {
        const { container } = renderWithTheme(<MetricsDisplay output={{ timeMetadata: undefined, usageMetadata: undefined }} />)
        expect(container.firstChild).toBeNull()
    })

    it('renders only the time chip when only delta is present', () => {
        renderWithTheme(<MetricsDisplay output={{ timeMetadata: { delta: 1500 } }} />)
        const group = screen.getByRole('group', { name: /metrics/i })
        expect(group).toHaveTextContent('1.50 seconds')
        expect(group).not.toHaveTextContent(/tokens/)
        expect(group).not.toHaveTextContent(/^\$/)
    })

    it('hides the time chip when delta is 0 (legacy parity: truthy check)', () => {
        renderWithTheme(<MetricsDisplay output={{ timeMetadata: { delta: 0 }, usageMetadata: { total_tokens: 5, total_cost: 0 } }} />)
        expect(screen.queryByText(/seconds/)).not.toBeInTheDocument()
        expect(screen.getByText('5 tokens')).toBeInTheDocument()
    })

    it('renders only the tokens chip when only tokens are present', () => {
        renderWithTheme(<MetricsDisplay output={{ usageMetadata: { total_tokens: 1234, total_cost: 0 } }} />)
        expect(screen.getByText('1,234 tokens')).toBeInTheDocument()
    })

    it('formats cost with 6 decimals when below $0.01', () => {
        renderWithTheme(<MetricsDisplay output={{ usageMetadata: { total_tokens: 0, total_cost: 0.000123 } }} />)
        expect(screen.getByText('$0.000123')).toBeInTheDocument()
    })

    it('formats cost with 2 decimals when at or above $0.01', () => {
        renderWithTheme(<MetricsDisplay output={{ usageMetadata: { total_tokens: 0, total_cost: 0.5 } }} />)
        expect(screen.getByText('$0.50')).toBeInTheDocument()
    })

    it('renders all three chips when all metrics are present', () => {
        renderWithTheme(
            <MetricsDisplay
                output={{
                    timeMetadata: { delta: 2500 },
                    usageMetadata: { total_tokens: 99, total_cost: 0.25 }
                }}
            />
        )
        expect(screen.getByText('2.50 seconds')).toBeInTheDocument()
        expect(screen.getByText('99 tokens')).toBeInTheDocument()
        expect(screen.getByText('$0.25')).toBeInTheDocument()
    })
})
