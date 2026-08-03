import React, { type ReactElement } from 'react'

import { ThemeProvider } from '@mui/material/styles'
import { fireEvent, render, screen } from '@testing-library/react'

import { createObserveTheme } from '@/core/theme'

import { ToolAccordionList } from './ToolAccordionList'

// JsonBlock pulls in the syntax highlighter via @/atoms — stub it.
jest.mock('react-syntax-highlighter', () => ({
    Prism: ({ children }: { children?: React.ReactNode }) => <pre data-testid='syntax-highlighter'>{children}</pre>
}))
jest.mock('react-syntax-highlighter/dist/esm/styles/prism', () => ({ oneDark: {} }))

function renderWithTheme(ui: ReactElement, isDark = false) {
    return render(<ThemeProvider theme={createObserveTheme(isDark)}>{ui}</ThemeProvider>)
}

describe('ToolAccordionList — variant="available"', () => {
    it('renders a "Tools" heading and one row per tool', () => {
        renderWithTheme(<ToolAccordionList variant='available' tools={[{ name: 'search' }, { name: 'lookup' }]} isDarkMode={false} />)
        expect(screen.getByText('Tools')).toBeInTheDocument()
        expect(screen.getByText('search')).toBeInTheDocument()
        expect(screen.getByText('lookup')).toBeInTheDocument()
    })

    it('returns null when the tools array is empty', () => {
        const { container } = renderWithTheme(<ToolAccordionList variant='available' tools={[]} isDarkMode={false} />)
        expect(container).toBeEmptyDOMElement()
    })

    it('prefers toolNode.label / toolNode.name over the raw name', () => {
        renderWithTheme(
            <ToolAccordionList
                variant='available'
                tools={[{ name: 'raw_name', toolNode: { name: 'iconName', label: 'Pretty Label' } }]}
                isDarkMode={false}
            />
        )
        expect(screen.getByText('Pretty Label')).toBeInTheDocument()
        expect(screen.queryByText('raw_name')).not.toBeInTheDocument()
    })

    it('shows a "Used" chip on rows whose name appears in usedTools', () => {
        renderWithTheme(
            <ToolAccordionList
                variant='available'
                tools={[{ name: 'search' }, { name: 'lookup' }]}
                usedTools={[{ tool: 'search' }]}
                isDarkMode={false}
            />
        )
        const used = screen.getAllByText('Used')
        expect(used).toHaveLength(1)
    })

    it('hides the Used chip when usedTools is missing or has no matches', () => {
        renderWithTheme(<ToolAccordionList variant='available' tools={[{ name: 'search' }]} isDarkMode={false} />)
        expect(screen.queryByText('Used')).not.toBeInTheDocument()
    })

    it('paginates with "Show N more" / "Show less" past initialVisibleCount', () => {
        const tools = Array.from({ length: 7 }, (_, i) => ({ name: `tool_${i}` }))
        renderWithTheme(<ToolAccordionList variant='available' tools={tools} initialVisibleCount={3} isDarkMode={false} />)
        expect(screen.getByText('tool_0')).toBeInTheDocument()
        expect(screen.getByText('tool_2')).toBeInTheDocument()
        expect(screen.queryByText('tool_3')).not.toBeInTheDocument()

        fireEvent.click(screen.getByRole('button', { name: 'Show 4 more' }))
        expect(screen.getByText('tool_3')).toBeInTheDocument()
        expect(screen.getByText('tool_6')).toBeInTheDocument()
        expect(screen.getByRole('button', { name: 'Show less' })).toBeInTheDocument()

        fireEvent.click(screen.getByRole('button', { name: 'Show less' }))
        expect(screen.queryByText('tool_3')).not.toBeInTheDocument()
    })

    it('hides the pagination button when tool count is below initialVisibleCount', () => {
        renderWithTheme(
            <ToolAccordionList variant='available' tools={[{ name: 'a' }, { name: 'b' }]} initialVisibleCount={5} isDarkMode={false} />
        )
        expect(screen.queryByRole('button', { name: /Show / })).not.toBeInTheDocument()
    })
})

describe('ToolAccordionList — variant="called"', () => {
    it('renders a "Called" chip on each call with the resolved label', () => {
        renderWithTheme(
            <ToolAccordionList
                variant='called'
                calls={[
                    { raw: { name: 'search', args: {} }, name: 'search' },
                    { raw: { name: 'lookup', args: {} }, name: 'lookup' }
                ]}
                isDarkMode={false}
            />
        )
        expect(screen.getAllByText('Called')).toHaveLength(2)
        expect(screen.getByText('search')).toBeInTheDocument()
        expect(screen.getByText('lookup')).toBeInTheDocument()
    })

    it('returns null when the calls array is empty', () => {
        const { container } = renderWithTheme(<ToolAccordionList variant='called' calls={[]} isDarkMode={false} />)
        expect(container).toBeEmptyDOMElement()
    })

    it('uses availableTools to resolve a pretty label when present', () => {
        renderWithTheme(
            <ToolAccordionList
                variant='called'
                calls={[{ raw: { name: 'search' }, name: 'search' }]}
                availableTools={[{ name: 'search', toolNode: { name: 'searchIcon', label: 'Web Search' } }]}
                isDarkMode={false}
            />
        )
        expect(screen.getByText('Web Search')).toBeInTheDocument()
    })

    it('does NOT render the "Tools" heading or the pagination button', () => {
        renderWithTheme(
            <ToolAccordionList
                variant='called'
                calls={Array.from({ length: 10 }, (_, i) => ({ raw: { i }, name: `call_${i}` }))}
                isDarkMode={false}
            />
        )
        expect(screen.queryByText('Tools')).not.toBeInTheDocument()
        expect(screen.queryByRole('button', { name: /Show / })).not.toBeInTheDocument()
    })
})
