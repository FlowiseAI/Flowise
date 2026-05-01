import type { ReactElement } from 'react'

import { ThemeProvider } from '@mui/material/styles'
import { render, screen } from '@testing-library/react'

import { createObserveTheme } from '@/core/theme'
import { isUsedToolArray } from '@/core/utils'

import { UsedToolChips } from './UsedToolChips'

function renderWithTheme(ui: ReactElement, isDark = false) {
    return render(<ThemeProvider theme={createObserveTheme(isDark)}>{ui}</ThemeProvider>)
}

describe('isUsedToolArray', () => {
    it('returns true for a non-empty array of object entries', () => {
        expect(isUsedToolArray([{ tool: 'a' }])).toBe(true)
    })

    it('returns false for empty arrays, non-arrays, and arrays of non-objects', () => {
        expect(isUsedToolArray([])).toBe(false)
        expect(isUsedToolArray('a')).toBe(false)
        expect(isUsedToolArray(null)).toBe(false)
        expect(isUsedToolArray(['a'])).toBe(false)
    })
})

describe('UsedToolChips', () => {
    it('renders a chip per tool with its label', () => {
        renderWithTheme(<UsedToolChips tools={[{ tool: 'search_repositories' }, { tool: 'get_file_contents' }]} />)
        expect(screen.getByText('search_repositories')).toBeInTheDocument()
        expect(screen.getByText('get_file_contents')).toBeInTheDocument()
    })

    it('renders nothing when the filtered list is empty', () => {
        const { container } = renderWithTheme(<UsedToolChips tools={[]} />)
        expect(container).toBeEmptyDOMElement()
    })

    it('flags an errored tool with red border + red text via the error palette', () => {
        // `error.main` resolves to #f44336 / rgb(244, 67, 54). jsdom normalizes
        // sx-based `color` to rgb() but keeps inline `borderColor` as the hex.
        renderWithTheme(<UsedToolChips tools={[{ tool: 'bad_tool', error: 'boom' }]} />)
        const chip = screen.getByText('bad_tool').closest('.MuiChip-root') as HTMLElement
        const styles = getComputedStyle(chip)
        expect(styles.color).toMatch(/rgb\(244,\s*67,\s*54\)|#f44336/i)
        expect(styles.borderColor).toMatch(/rgb\(244,\s*67,\s*54\)|#f44336/i)
    })

    it('does not apply the error palette to a successful tool', () => {
        renderWithTheme(<UsedToolChips tools={[{ tool: 'good_tool' }]} />)
        const chip = screen.getByText('good_tool').closest('.MuiChip-root') as HTMLElement
        const styles = getComputedStyle(chip)
        expect(styles.color).not.toMatch(/rgb\(244,\s*67,\s*54\)|#f44336/i)
    })
})
