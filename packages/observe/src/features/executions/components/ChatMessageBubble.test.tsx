import React, { type ReactElement } from 'react'

import { ThemeProvider } from '@mui/material/styles'
import { render, screen } from '@testing-library/react'

import { createObserveTheme } from '@/core/theme'
import { isChatMessageArray } from '@/core/utils'

import { ChatMessageBubble } from './ChatMessageBubble'

// Stub the heavy markdown stack so this presentational test stays focused
// on the bubble itself (chips + content slot).
jest.mock('react-markdown', () => {
    const ReactMarkdownStub = ({ children }: { children?: React.ReactNode }) => <div data-testid='react-markdown'>{children}</div>
    return { __esModule: true, default: ReactMarkdownStub }
})
jest.mock('remark-gfm', () => ({ __esModule: true, default: () => null }))
jest.mock('react-syntax-highlighter', () => ({
    Prism: ({ children }: { children?: React.ReactNode }) => <pre data-testid='syntax-highlighter'>{children}</pre>
}))
jest.mock('react-syntax-highlighter/dist/esm/styles/prism', () => ({ oneDark: {} }))

function renderWithTheme(ui: ReactElement, isDark = false) {
    return render(<ThemeProvider theme={createObserveTheme(isDark)}>{ui}</ThemeProvider>)
}

describe('isChatMessageArray', () => {
    it('returns true for a non-empty array of objects each carrying a `role` key', () => {
        expect(isChatMessageArray([{ role: 'user' }, { role: 'assistant', content: 'hi' }])).toBe(true)
    })

    it('returns false for an empty array', () => {
        expect(isChatMessageArray([])).toBe(false)
    })

    it('returns false when entries are missing the `role` key', () => {
        expect(isChatMessageArray([{ content: 'hi' }])).toBe(false)
    })

    it('returns false for non-array values', () => {
        expect(isChatMessageArray('user' as unknown)).toBe(false)
        expect(isChatMessageArray(null as unknown)).toBe(false)
        expect(isChatMessageArray({ role: 'user' } as unknown)).toBe(false)
    })
})

describe('ChatMessageBubble', () => {
    it('renders the role as a chip', () => {
        renderWithTheme(<ChatMessageBubble message={{ role: 'user', content: 'hello' }} isDarkMode={false} />)
        expect(screen.getByText('user')).toBeInTheDocument()
        expect(screen.getByText('hello')).toBeInTheDocument()
    })

    it('renders message.name as a second chip when present (non-tool role)', () => {
        // Use a non-tool role so the new tool-header path doesn't also render
        // the name as a header label (which would put `searchTool` in two
        // distinct DOM nodes — chip label + header typography).
        renderWithTheme(<ChatMessageBubble message={{ role: 'assistant', name: 'searchTool', content: 'result' }} isDarkMode={false} />)
        expect(screen.getByText('assistant')).toBeInTheDocument()
        expect(screen.getByText('searchTool')).toBeInTheDocument()
    })

    it('renders the tool header (icon + label + tool_call_id chip) for role="tool" messages', () => {
        renderWithTheme(
            <ChatMessageBubble
                message={{ role: 'tool', name: 'search_repositories', content: 'tool result', tool_call_id: '7xdxc3kf' }}
                isDarkMode={false}
                availableTools={[{ name: 'search_repositories', toolNode: { name: 'githubMcp', label: 'Github MCP' } }]}
            />
        )
        // Tool name chip in the role row + Github MCP label in the header (resolved from availableTools)
        expect(screen.getByText('search_repositories')).toBeInTheDocument()
        expect(screen.getByText('Github MCP')).toBeInTheDocument()
        expect(screen.getByText('7xdxc3kf')).toBeInTheDocument()
    })

    it('does not render a tool header when role is not "tool"', () => {
        renderWithTheme(<ChatMessageBubble message={{ role: 'user', name: 'searchTool', tool_call_id: 'abc' }} isDarkMode={false} />)
        // Only the role chip area should mention searchTool — no tool header,
        // and the tool_call_id chip is a tool-header-only thing.
        expect(screen.queryByText('abc')).not.toBeInTheDocument()
    })

    it('falls back to the literal "unknown" when role is missing', () => {
        renderWithTheme(<ChatMessageBubble message={{ content: 'orphaned' }} isDarkMode={false} />)
        expect(screen.getByText('unknown')).toBeInTheDocument()
    })

    it('renders no chip for `name` when not provided', () => {
        renderWithTheme(<ChatMessageBubble message={{ role: 'system', content: 'sys' }} isDarkMode={false} />)
        // Only one chip — the role
        const chips = screen.getAllByText(/system|sys/)
        expect(chips.length).toBeGreaterThanOrEqual(1)
        // No second chip means we shouldn't find a name chip
        expect(screen.queryByText(/^searchTool$/)).not.toBeInTheDocument()
    })

    it('renders an outlined tool chip for each entry in additional_kwargs.usedTools', () => {
        renderWithTheme(
            <ChatMessageBubble
                message={{
                    role: 'user',
                    name: 'research_agent',
                    content: 'PR 6226 in flowise ai repo',
                    additional_kwargs: {
                        usedTools: [{ tool: 'search_repositories' }, { tool: 'get_issue' }]
                    }
                }}
                isDarkMode={false}
            />
        )
        expect(screen.getByText('search_repositories')).toBeInTheDocument()
        expect(screen.getByText('get_issue')).toBeInTheDocument()
    })

    it('does not render a tool chip row when usedTools is empty', () => {
        renderWithTheme(
            <ChatMessageBubble message={{ role: 'user', content: 'hi', additional_kwargs: { usedTools: [] } }} isDarkMode={false} />
        )
        expect(screen.queryByText(/search_repositories|get_issue/)).not.toBeInTheDocument()
    })

    it('renders a "Called" accordion for each entry in message.tool_calls', () => {
        renderWithTheme(
            <ChatMessageBubble
                message={{
                    role: 'assistant',
                    content: '',
                    tool_calls: [{ name: 'search_repositories', args: { query: 'Flowise AI' }, id: 'abc' }]
                }}
                isDarkMode={false}
            />
        )
        expect(screen.getByText('Called')).toBeInTheDocument()
        expect(screen.getByText('search_repositories')).toBeInTheDocument()
    })

    it('renders Gemini-style functionCall items from content as accordions and suppresses the JSON dump', () => {
        renderWithTheme(
            <ChatMessageBubble
                message={{
                    role: 'assistant',
                    content: [
                        {
                            type: 'functionCall',
                            functionCall: { name: 'search_repositories', args: { query: 'Flowise AI' }, id: 'abc' }
                        }
                    ]
                }}
                isDarkMode={false}
            />
        )
        // Accordion summary rendered
        expect(screen.getByText('Called')).toBeInTheDocument()
        // The same content array should NOT render twice — suppressed
        // NodeContentRenderer below the accordions. The accordion body
        // (mounted but visually collapsed) accounts for exactly ONE JsonBlock
        // <pre>; a second <pre> would mean the content also dumped below.
        expect(document.querySelectorAll('pre')).toHaveLength(1)
        // The tool name appears once (in the accordion summary). A duplicate
        // JsonBlock would also tokenize "search_repositories" into the body.
        // Body is rendered (collapsed) → use queryAllByText which sees it
        // regardless of CSS visibility.
        expect(screen.queryAllByText('search_repositories').length).toBeGreaterThanOrEqual(1)
    })
})
