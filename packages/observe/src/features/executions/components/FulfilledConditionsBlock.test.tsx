import type { ReactElement } from 'react'

import { ThemeProvider } from '@mui/material/styles'
import { render, screen } from '@testing-library/react'

import { createObserveTheme } from '@/core/theme'
import type { ConditionEntry } from '@/core/types'
import { isConditionArray } from '@/core/utils'

import { FulfilledConditionsBlock } from './FulfilledConditionsBlock'

// JsonBlock is imported transitively through atoms/index.ts → CodeFenceBlock,
// which pulls in react-syntax-highlighter (ESM-only). Stub it so jest can
// load the module graph without a custom transformer.
jest.mock('react-syntax-highlighter', () => ({ Prism: () => null }))
jest.mock('react-syntax-highlighter/dist/esm/styles/prism', () => ({ oneDark: {} }))

function renderWithTheme(ui: ReactElement) {
    return render(<ThemeProvider theme={createObserveTheme(false)}>{ui}</ThemeProvider>)
}

describe('isConditionArray', () => {
    it('returns true for a non-empty array of objects each carrying `isFulfilled`', () => {
        expect(isConditionArray([{ isFulfilled: true }, { isFulfilled: false }])).toBe(true)
    })

    it('returns false for empty arrays and arrays missing isFulfilled', () => {
        expect(isConditionArray([])).toBe(false)
        expect(isConditionArray([{ value1: 'a' }])).toBe(false)
    })

    it('returns false for non-array values', () => {
        expect(isConditionArray(null)).toBe(false)
        expect(isConditionArray({ isFulfilled: true })).toBe(false)
    })
})

describe('FulfilledConditionsBlock', () => {
    it('renders only fulfilled conditions, hiding unfulfilled ones', () => {
        const conditions: ConditionEntry[] = [
            { type: 'string', operation: 'equal', value1: 'a', value2: 'a', isFulfilled: true },
            { type: 'string', operation: 'equal', value1: 'b', value2: 'c', isFulfilled: false }
        ]
        renderWithTheme(<FulfilledConditionsBlock conditions={conditions} isDarkMode={false} />)
        expect(screen.getByText('Condition 0')).toBeInTheDocument()
        expect(screen.queryByText('Condition 1')).not.toBeInTheDocument()
        expect(screen.getAllByText('Fulfilled')).toHaveLength(1)
    })

    it('labels the empty-string equal branch as "Else condition fulfilled"', () => {
        const conditions: ConditionEntry[] = [{ type: 'string', operation: 'equal', value1: '', value2: '', isFulfilled: true }]
        renderWithTheme(<FulfilledConditionsBlock conditions={conditions} isDarkMode={false} />)
        expect(screen.getByText('Else condition fulfilled')).toBeInTheDocument()
        expect(screen.getByText('Fulfilled')).toBeInTheDocument()
        // Else branches do NOT render a "Condition N" header — they use the
        // sentence-style label instead.
        expect(screen.queryByText(/^Condition /)).not.toBeInTheDocument()
    })

    it('renders nothing when no condition is fulfilled', () => {
        const conditions: ConditionEntry[] = [{ type: 'string', operation: 'equal', value1: 'a', value2: 'b', isFulfilled: false }]
        const { container } = renderWithTheme(<FulfilledConditionsBlock conditions={conditions} isDarkMode={false} />)
        expect(container.firstChild).toBeNull()
    })

    it('labels each fulfilled entry with its index in the original array', () => {
        // The displayed number must match the branch the user configured in
        // the Condition node editor. A single fulfilled entry at original
        // index 2 renders as "Condition 2", not "Condition 0".
        const conditions: ConditionEntry[] = [
            { type: 'string', value1: 'a', value2: 'b', isFulfilled: false },
            { type: 'string', value1: 'a', value2: 'c', isFulfilled: false },
            { type: 'string', value1: 'a', value2: 'a', isFulfilled: true }
        ]
        renderWithTheme(<FulfilledConditionsBlock conditions={conditions} isDarkMode={false} />)
        expect(screen.getByText('Condition 2')).toBeInTheDocument()
        expect(screen.queryByText('Condition 0')).not.toBeInTheDocument()
    })

    it('preserves gaps when non-contiguous entries are fulfilled', () => {
        const conditions: ConditionEntry[] = [
            { type: 'string', value1: 'a', value2: 'a', isFulfilled: true },
            { type: 'string', value1: 'a', value2: 'b', isFulfilled: false },
            { type: 'string', value1: 'a', value2: 'a', isFulfilled: true }
        ]
        renderWithTheme(<FulfilledConditionsBlock conditions={conditions} isDarkMode={false} />)
        expect(screen.getByText('Condition 0')).toBeInTheDocument()
        expect(screen.queryByText('Condition 1')).not.toBeInTheDocument()
        expect(screen.getByText('Condition 2')).toBeInTheDocument()
    })

    it('renders the condition object as inline JSON in the body', () => {
        const conditions: ConditionEntry[] = [{ type: 'string', operation: 'equal', value1: 'foo', value2: 'foo', isFulfilled: true }]
        const { container } = renderWithTheme(<FulfilledConditionsBlock conditions={conditions} isDarkMode={false} />)
        const pre = container.querySelectorAll('pre')
        const flat = Array.from(pre).find((el) => el.textContent?.includes('"value1"') && el.textContent?.includes('"foo"'))
        expect(flat).toBeDefined()
    })
})
