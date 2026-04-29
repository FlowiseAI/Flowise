import React, { type ReactElement } from 'react'

import { ThemeProvider } from '@mui/material/styles'
import { render, screen } from '@testing-library/react'

import { createObserveTheme } from '@/core/theme'

import { NodeContentRenderer } from './NodeContentRenderer'

// react-markdown ships ESM-only — Jest can't parse it with our ts-jest
// preset. Stub it with a minimal implementation that *invokes* the
// `components.code` callback for both inline (single-tick) and fenced
// (triple-tick) snippets so we can drive the production `code` renderer's
// branching logic from a test without changing production code.
jest.mock('react-markdown', () => {
    type MarkdownComponentProps = { className?: string; children?: React.ReactNode }
    type MarkdownComponents = { code?: (props: MarkdownComponentProps) => React.ReactNode }
    const ReactMarkdownStub = ({ children, components = {} }: { children?: string; components?: MarkdownComponents }) => {
        const Code = components.code
        const text = String(children ?? '')
        const out: React.ReactNode[] = []
        let i = 0
        let key = 0
        while (i < text.length) {
            const fence = text.indexOf('```', i)
            const tick = text.indexOf('`', i)
            if (fence !== -1 && (tick === -1 || fence <= tick)) {
                if (fence > i) out.push(<span key={`t-${key++}`}>{text.slice(i, fence)}</span>)
                const langEnd = text.indexOf('\n', fence + 3)
                const close = text.indexOf('```', langEnd === -1 ? fence + 3 : langEnd)
                const lang = langEnd === -1 ? '' : text.slice(fence + 3, langEnd)
                const body =
                    langEnd === -1
                        ? text.slice(fence + 3, close === -1 ? text.length : close)
                        : text.slice(langEnd + 1, close === -1 ? text.length : close)
                const fenceK = `code-${key++}`
                out.push(
                    <React.Fragment key={fenceK}>
                        {Code ? Code({ className: lang ? `language-${lang}` : '', children: body }) : null}
                    </React.Fragment>
                )
                i = close === -1 ? text.length : close + 3
                continue
            }
            if (tick !== -1) {
                if (tick > i) out.push(<span key={`t-${key++}`}>{text.slice(i, tick)}</span>)
                const closeTick = text.indexOf('`', tick + 1)
                const body = text.slice(tick + 1, closeTick === -1 ? text.length : closeTick)
                const inlineK = `code-${key++}`
                out.push(<React.Fragment key={inlineK}>{Code ? Code({ className: '', children: body }) : null}</React.Fragment>)
                i = closeTick === -1 ? text.length : closeTick + 1
                continue
            }
            out.push(<span key={`t-${key++}`}>{text.slice(i)}</span>)
            i = text.length
        }
        return <div data-testid='react-markdown'>{out}</div>
    }
    return { __esModule: true, default: ReactMarkdownStub }
})
jest.mock('remark-gfm', () => ({ __esModule: true, default: () => null }))
jest.mock('react-syntax-highlighter', () => ({
    Prism: ({ children, language }: { children?: React.ReactNode; language?: string }) => (
        <pre data-testid='syntax-highlighter' data-language={language}>
            {children}
        </pre>
    )
}))
jest.mock('react-syntax-highlighter/dist/esm/styles/prism', () => ({ oneDark: {} }))

function renderWithTheme(ui: ReactElement, isDark = false) {
    return render(<ThemeProvider theme={createObserveTheme(isDark)}>{ui}</ThemeProvider>)
}

describe('NodeContentRenderer', () => {
    describe('null / undefined / placeholders', () => {
        it('renders the "No data" placeholder for null', () => {
            renderWithTheme(<NodeContentRenderer value={null} isDarkMode={false} />)
            expect(screen.getByText('No data')).toBeInTheDocument()
        })

        it('renders the "No data" placeholder for undefined', () => {
            renderWithTheme(<NodeContentRenderer value={undefined} isDarkMode={false} />)
            expect(screen.getByText('No data')).toBeInTheDocument()
        })
    })

    describe('object / JSON-parseable strings', () => {
        it('renders an object directly through JsonBlock (flat <pre>)', () => {
            const { container } = renderWithTheme(<NodeContentRenderer value={{ foo: 'bar', baz: 1 }} isDarkMode={false} />)
            const pre = container.querySelectorAll('pre')
            const flat = Array.from(pre).find((el) => el.textContent?.includes('"foo"') && el.textContent?.includes('"bar"'))
            expect(flat).toBeDefined()
        })

        it('renders a JSON-parseable string-of-an-object through JsonBlock', () => {
            const { container } = renderWithTheme(<NodeContentRenderer value={JSON.stringify({ foo: 'bar' })} isDarkMode={false} />)
            const pre = container.querySelectorAll('pre')
            const flat = Array.from(pre).find((el) => el.textContent?.includes('"foo"'))
            expect(flat).toBeDefined()
        })

        it('renders a JSON-parseable primitive string through JsonPrimitive (not the tree viewer)', () => {
            // The string '42' parses as the number 42. PARITY: legacy renders this through
            // a JsonViewer with a number-syntax color — we mirror with a styled span.
            renderWithTheme(<NodeContentRenderer value='42' isDarkMode={false} />)
            expect(screen.getByText('42')).toBeInTheDocument()
            expect(screen.queryByTestId('react-json-view')).not.toBeInTheDocument()
        })

        it('skips JsonPrimitive when parsePrimitiveAsJson=false (simple input path)', () => {
            // The simple-input path (Start / Direct Reply) renders strings as
            // markdown text without the inner bordered frame.
            renderWithTheme(<NodeContentRenderer value='42' isDarkMode={false} parsePrimitiveAsJson={false} />)
            expect(screen.getByText('42')).toBeInTheDocument()
        })

        it('forwards jsonMaxHeight to JsonBlock (different class vs default)', () => {
            // jsonMaxHeight is a thin pass-through onto JsonBlock's sx, which
            // resolves to an emotion className. A non-default value must
            // produce a different class — proving the prop wires through.
            const findJsonBox = (root: HTMLElement): HTMLElement | null =>
                Array.from(root.querySelectorAll('[class*="MuiBox-root"]')).find((el) => el.querySelector('pre')) as HTMLElement | null

            const defaultRender = renderWithTheme(<NodeContentRenderer value={{ k: 1 }} isDarkMode={false} />)
            const overriddenRender = renderWithTheme(<NodeContentRenderer value={{ k: 1 }} isDarkMode={false} jsonMaxHeight={123} />)

            const defaultBox = findJsonBox(defaultRender.container as HTMLElement)
            const overriddenBox = findJsonBox(overriddenRender.container as HTMLElement)
            expect(defaultBox).toBeTruthy()
            expect(overriddenBox).toBeTruthy()
            expect(overriddenBox!.className).not.toBe(defaultBox!.className)
        })
    })

    describe('plain primitives', () => {
        it('renders a number via the typography fallback', () => {
            renderWithTheme(<NodeContentRenderer value={42} isDarkMode={false} />)
            expect(screen.getByText('42')).toBeInTheDocument()
        })

        it('renders a plain (non-markdown) string in a Typography body', () => {
            renderWithTheme(<NodeContentRenderer value='hello' isDarkMode={false} />)
            expect(screen.getByText('hello')).toBeInTheDocument()
            expect(screen.queryByTestId('react-markdown')).not.toBeInTheDocument()
        })

        it('renders a markdown-looking string via react-markdown', () => {
            const md = '# Heading\n\nSome **bold** text'
            renderWithTheme(<NodeContentRenderer value={md} isDarkMode={false} />)
            expect(screen.getByTestId('react-markdown')).toHaveTextContent('# Heading')
        })

        it('renders an HTML-looking string as escaped markdown text (no rehype-raw)', () => {
            // PARITY: legacy MemoizedReactMarkdown does NOT enable rehype-raw,
            // so HTML payloads in markdown render as escaped text.
            renderWithTheme(<NodeContentRenderer value='<div class="x">hi</div>' isDarkMode={false} />)
            expect(screen.getByText(/hi/)).toBeInTheDocument()
        })
    })

    describe('inline-code branch (markdown stub drives the code renderer)', () => {
        it('renders single-tick inline code as a styled <code> element', () => {
            renderWithTheme(<NodeContentRenderer value='Use `npm install` to add it.' isDarkMode={false} />)
            const code = screen.getByText('npm install')
            expect(code.tagName.toLowerCase()).toBe('code')
            expect(screen.queryByTestId('syntax-highlighter')).not.toBeInTheDocument()
        })

        it('does NOT route inline code through the fenced CodeFenceBlock', () => {
            renderWithTheme(<NodeContentRenderer value='hello `inline` world' isDarkMode={false} />)
            // CodeFenceBlock would render copy/download icon buttons.
            expect(screen.queryByRole('button', { name: /copy/i })).not.toBeInTheDocument()
            expect(screen.queryByRole('button', { name: /download/i })).not.toBeInTheDocument()
        })

        it('routes triple-backtick fenced code through CodeFenceBlock with a language', () => {
            renderWithTheme(<NodeContentRenderer value={'Result:\n```js\nconst x = 1;\n```'} isDarkMode={false} />)
            const block = screen.getByTestId('syntax-highlighter')
            expect(block).toHaveAttribute('data-language', 'js')
            expect(block).toHaveTextContent('const x = 1;')
        })

        it('uses distinct chip backgrounds for light and dark mode', () => {
            const { container: light } = renderWithTheme(<NodeContentRenderer value='Try `flag` here.' isDarkMode={false} />, false)
            const { container: dark } = renderWithTheme(<NodeContentRenderer value='Try `flag` here.' isDarkMode={true} />, true)
            const lightCode = light.querySelector('code') as HTMLElement
            const darkCode = dark.querySelector('code') as HTMLElement
            const lightBg = lightCode.style.backgroundColor || getComputedStyle(lightCode).backgroundColor
            const darkBg = darkCode.style.backgroundColor || getComputedStyle(darkCode).backgroundColor
            // Implementation: dark = rgba(255,255,255,0.08), light = rgba(0,0,0,0.08).
            expect(lightBg).toBe('rgba(0, 0, 0, 0.08)')
            expect(darkBg).toBe('rgba(255, 255, 255, 0.08)')
        })
    })

    describe('mid-line fence preprocessing (PARITY: react-markdown v9)', () => {
        it('routes a mid-line fenced block through CodeFenceBlock (no stray empty fence at end)', () => {
            // CommonMark requires fences to begin at a line start. Agent outputs
            // frequently embed mid-line fences ("Summary: ```json\n…"). The
            // preprocessing step injects \n before mid-line fences so v9 parses
            // them as proper blocks rather than misreading the closing ``` as a
            // new opening fence with no body.
            renderWithTheme(<NodeContentRenderer value={'Summary: ```json\n{"k":1}\n```'} isDarkMode={false} />)
            const blocks = screen.getAllByTestId('syntax-highlighter')
            expect(blocks).toHaveLength(1)
            expect(blocks[0]).toHaveAttribute('data-language', 'json')
            expect(blocks[0]).toHaveTextContent('{"k":1}')
        })
    })
})
