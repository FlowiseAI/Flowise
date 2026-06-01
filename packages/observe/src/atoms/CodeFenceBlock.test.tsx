import type { ReactElement } from 'react'

import { ThemeProvider } from '@mui/material/styles'
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'

import { createObserveTheme } from '@/core/theme'

import { CodeFenceBlock } from './CodeFenceBlock'

// react-syntax-highlighter ships pure ESM in dist/esm — Jest can't transform.
// Stub it so we can focus on header (copy/download) behavior.
jest.mock('react-syntax-highlighter', () => ({
    Prism: ({ children, language }: { children?: React.ReactNode; language?: string }) => (
        <pre data-testid='syntax-highlighter' data-language={language}>
            {children}
        </pre>
    )
}))
jest.mock('react-syntax-highlighter/dist/esm/styles/prism', () => ({ oneDark: {} }))

function renderWithTheme(ui: ReactElement) {
    return render(<ThemeProvider theme={createObserveTheme(false)}>{ui}</ThemeProvider>)
}

describe('CodeFenceBlock', () => {
    beforeEach(() => {
        jest.useFakeTimers()
    })

    afterEach(() => {
        act(() => {
            jest.runOnlyPendingTimers()
        })
        jest.useRealTimers()
        jest.restoreAllMocks()
    })

    it('renders the code text and language label in the header', () => {
        renderWithTheme(<CodeFenceBlock value='print("hi")' language='python' />)
        expect(screen.getByTestId('syntax-highlighter')).toHaveTextContent('print("hi")')
        expect(screen.getByText('python')).toBeInTheDocument()
    })

    describe('copy', () => {
        it('writes the value to the clipboard and swaps the icon to a check on click', async () => {
            const writeText = jest.fn().mockResolvedValue(undefined)
            Object.defineProperty(navigator, 'clipboard', {
                value: { writeText },
                configurable: true
            })

            renderWithTheme(<CodeFenceBlock value='hello world' language='text' />)
            const copyButton = screen.getByRole('button', { name: /copy/i })
            fireEvent.click(copyButton)

            expect(writeText).toHaveBeenCalledWith('hello world')
            // Tooltip text should swap to "Copied!" while the timer is running
            await waitFor(() => expect(screen.getByLabelText(/copied/i)).toBeInTheDocument())

            // After the 1.5s reset window, the tooltip reverts back to "Copy"
            act(() => {
                jest.advanceTimersByTime(1500)
            })
            await waitFor(() => expect(screen.getByLabelText(/copy/i)).toBeInTheDocument())
        })

        it('no-ops when navigator.clipboard.writeText is unavailable', () => {
            Object.defineProperty(navigator, 'clipboard', { value: undefined, configurable: true })
            renderWithTheme(<CodeFenceBlock value='hello' language='text' />)
            // Should not throw; component remains in its initial (un-copied) state
            expect(() => fireEvent.click(screen.getByRole('button', { name: /copy/i }))).not.toThrow()
        })

        it('does NOT flash "Copied!" when the clipboard write rejects, and warns to the console', async () => {
            // Permission denied / secure-context violation / focused-frame
            // issues all reject the writeText promise. The UI must reflect
            // that the copy did not happen rather than show a false success,
            // AND the failure must be logged so it's debuggable in the field.
            const writeText = jest.fn().mockRejectedValue(new Error('NotAllowedError'))
            Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true })
            const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {})

            renderWithTheme(<CodeFenceBlock value='secret' language='text' />)
            await act(async () => {
                fireEvent.click(screen.getByRole('button', { name: /copy/i }))
            })
            expect(writeText).toHaveBeenCalledWith('secret')
            expect(screen.getByLabelText(/^copy$/i)).toBeInTheDocument()
            expect(screen.queryByLabelText(/copied/i)).not.toBeInTheDocument()
            expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('Clipboard copy failed'), expect.any(Error))
            warnSpy.mockRestore()
        })
    })

    describe('download', () => {
        it('downloads with the language-derived filename and extension', () => {
            const createObjectURL = jest.fn().mockReturnValue('blob:mock')
            const revokeObjectURL = jest.fn()
            // jsdom only ships a stub for createObjectURL; both need overrides.
            Object.defineProperty(URL, 'createObjectURL', { value: createObjectURL, configurable: true })
            Object.defineProperty(URL, 'revokeObjectURL', { value: revokeObjectURL, configurable: true })

            const clickSpy = jest.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})

            renderWithTheme(<CodeFenceBlock value='{"k":1}' language='json' />)
            fireEvent.click(screen.getByRole('button', { name: /download/i }))

            expect(createObjectURL).toHaveBeenCalledTimes(1)
            const blob = createObjectURL.mock.calls[0][0] as Blob
            expect(blob).toBeInstanceOf(Blob)

            // The synthesized anchor is captured at the moment of click — its
            // download attribute reflects the language-derived basename + ext.
            const anchor = clickSpy.mock.instances[0] as unknown as HTMLAnchorElement
            expect(anchor.download).toBe('snippet-json.json')
            expect(revokeObjectURL).toHaveBeenCalledWith('blob:mock')
        })

        it('falls back to .txt and a generic basename when language is missing', () => {
            const createObjectURL = jest.fn().mockReturnValue('blob:mock')
            const revokeObjectURL = jest.fn()
            Object.defineProperty(URL, 'createObjectURL', { value: createObjectURL, configurable: true })
            Object.defineProperty(URL, 'revokeObjectURL', { value: revokeObjectURL, configurable: true })

            const clickSpy = jest.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})

            renderWithTheme(<CodeFenceBlock value='hello' language='' />)
            fireEvent.click(screen.getByRole('button', { name: /download/i }))

            const anchor = clickSpy.mock.instances[0] as unknown as HTMLAnchorElement
            expect(anchor.download).toBe('snippet.txt')
        })

        it('falls back to .txt for an unrecognized language while keeping the language in the filename', () => {
            const createObjectURL = jest.fn().mockReturnValue('blob:mock')
            const revokeObjectURL = jest.fn()
            Object.defineProperty(URL, 'createObjectURL', { value: createObjectURL, configurable: true })
            Object.defineProperty(URL, 'revokeObjectURL', { value: revokeObjectURL, configurable: true })

            const clickSpy = jest.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})

            renderWithTheme(<CodeFenceBlock value='content' language='brainfuck' />)
            fireEvent.click(screen.getByRole('button', { name: /download/i }))

            const anchor = clickSpy.mock.instances[0] as unknown as HTMLAnchorElement
            expect(anchor.download).toBe('snippet-brainfuck.txt')
        })

        it('matches the language map case-insensitively (legacy behavior was case-sensitive)', () => {
            const createObjectURL = jest.fn().mockReturnValue('blob:mock')
            const revokeObjectURL = jest.fn()
            Object.defineProperty(URL, 'createObjectURL', { value: createObjectURL, configurable: true })
            Object.defineProperty(URL, 'revokeObjectURL', { value: revokeObjectURL, configurable: true })

            const clickSpy = jest.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})

            renderWithTheme(<CodeFenceBlock value='print(1)' language='Python' />)
            fireEvent.click(screen.getByRole('button', { name: /download/i }))

            const anchor = clickSpy.mock.instances[0] as unknown as HTMLAnchorElement
            // Lookup is case-insensitive AND lowercases for the filename basename.
            expect(anchor.download).toBe('snippet-python.py')
        })
    })
})
