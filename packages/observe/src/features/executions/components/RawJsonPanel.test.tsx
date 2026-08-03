import { type ReactElement } from 'react'

import { ThemeProvider } from '@mui/material/styles'
import { fireEvent, render, screen } from '@testing-library/react'

import { createObserveTheme } from '@/core/theme'

import { RawJsonPanel } from './RawJsonPanel'

// flowise-react-json-view depends on canvas in jsdom and ships its own
// clipboard hook — stub it so we can drive `enableClipboard` directly with a
// synthesized event { src }.
jest.mock('flowise-react-json-view', () => {
    const ReactJsonStub = ({ src, enableClipboard }: { src: unknown; enableClipboard?: (e: { src: unknown }) => void }) => (
        <div>
            <pre data-testid='react-json-view'>{JSON.stringify(src)}</pre>
            <button data-testid='copy-trigger' onClick={() => enableClipboard?.({ src })}>
                copy
            </button>
        </div>
    )
    return { __esModule: true, default: ReactJsonStub }
})

function renderWithTheme(ui: ReactElement) {
    return render(<ThemeProvider theme={createObserveTheme(false)}>{ui}</ThemeProvider>)
}

describe('RawJsonPanel', () => {
    afterEach(() => jest.restoreAllMocks())

    it('renders the JSON tree of the supplied src', () => {
        renderWithTheme(<RawJsonPanel src={{ foo: 'bar' }} isDarkMode={false} />)
        expect(screen.getByTestId('react-json-view')).toHaveTextContent(JSON.stringify({ foo: 'bar' }))
    })

    it('stops click propagation on its container so wrapping selectors do not steal focus', () => {
        // The wrapper sets onClick={(e) => e.stopPropagation()}. Render inside
        // an outer onClick listener and verify it does NOT fire when clicking
        // inside the panel.
        const outerHandler = jest.fn()
        renderWithTheme(
            // eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions
            <div onClick={outerHandler} data-testid='outer'>
                <RawJsonPanel src={{ k: 1 }} isDarkMode={false} />
            </div>
        )
        fireEvent.click(screen.getByTestId('react-json-view'))
        expect(outerHandler).not.toHaveBeenCalled()

        // Sanity: clicking the *outside* still fires it.
        fireEvent.click(screen.getByTestId('outer'))
        expect(outerHandler).toHaveBeenCalledTimes(1)
    })

    describe('onClipboardCopy', () => {
        it('pretty-prints object src with 2-space indent', () => {
            const writeText = jest.fn().mockResolvedValue(undefined)
            Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true })

            renderWithTheme(<RawJsonPanel src={{ a: 1, b: { c: 2 } }} isDarkMode={false} />)
            fireEvent.click(screen.getByTestId('copy-trigger'))

            expect(writeText).toHaveBeenCalledWith(JSON.stringify({ a: 1, b: { c: 2 } }, null, 2))
        })

        it('pretty-prints array src with 2-space indent', () => {
            const writeText = jest.fn().mockResolvedValue(undefined)
            Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true })

            renderWithTheme(<RawJsonPanel src={[1, 2, 3]} isDarkMode={false} />)
            fireEvent.click(screen.getByTestId('copy-trigger'))

            expect(writeText).toHaveBeenCalledWith(JSON.stringify([1, 2, 3], null, 2))
        })

        it('falls back to String() for non-object primitives', () => {
            // `enableClipboard` can fire with `{ src: 42 }` if the user clicks
            // a leaf node — we should pass the stringified primitive, not
            // `JSON.stringify` it (which would quote it as `"42"`).
            const writeText = jest.fn().mockResolvedValue(undefined)
            Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true })

            renderWithTheme(<RawJsonPanel src={{ count: 42 }} isDarkMode={false} />)
            // Synthesize a leaf-node copy by directly invoking the callback
            // through the stub. The stub only fires `enableClipboard({ src })`
            // with the whole `src`, so for primitives we use a top-level
            // primitive payload via a separate render.
            // (The wrapper accepts `unknown` but the real component types it
            // as `object` — pass via cast for the primitive path.)
            ;(navigator.clipboard.writeText as jest.Mock).mockClear()

            const PrimitiveCase = ({ value }: { value: unknown }) => <RawJsonPanel src={value as object} isDarkMode={false} />
            renderWithTheme(<PrimitiveCase value={42} />)
            const triggers = screen.getAllByTestId('copy-trigger')
            fireEvent.click(triggers[triggers.length - 1])
            expect(writeText).toHaveBeenLastCalledWith('42')
        })

        it('warns to the console when navigator.clipboard.writeText rejects', async () => {
            const err = new Error('NotAllowedError')
            const writeText = jest.fn().mockRejectedValue(err)
            Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true })
            const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {})

            renderWithTheme(<RawJsonPanel src={{ k: 1 }} isDarkMode={false} />)
            fireEvent.click(screen.getByTestId('copy-trigger'))
            // Allow the rejection microtask to run.
            await Promise.resolve()
            await Promise.resolve()

            expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('Clipboard copy failed'), err)
        })

        it('no-ops when navigator.clipboard.writeText is unavailable', () => {
            Object.defineProperty(navigator, 'clipboard', { value: undefined, configurable: true })
            renderWithTheme(<RawJsonPanel src={{ k: 1 }} isDarkMode={false} />)
            // Should not throw; no clipboard side-effects observable.
            expect(() => fireEvent.click(screen.getByTestId('copy-trigger'))).not.toThrow()
        })
    })
})
