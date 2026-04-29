import type { ReactElement } from 'react'

import { ThemeProvider } from '@mui/material/styles'
import { render, screen } from '@testing-library/react'

import { createObserveTheme } from '@/core/theme'

import { JsonBlock, JsonPrimitive } from './JsonBlock'

function renderWithTheme(ui: ReactElement, isDark = false) {
    return render(<ThemeProvider theme={createObserveTheme(isDark)}>{ui}</ThemeProvider>)
}

describe('JsonBlock', () => {
    it('renders a flat <pre> containing every key and value from the input object', () => {
        const { container } = renderWithTheme(<JsonBlock value={{ name: 'Ada', count: 42 }} isDarkMode={false} />)
        const pre = container.querySelector('pre')
        expect(pre).not.toBeNull()
        expect(pre!.textContent).toContain('"name"')
        expect(pre!.textContent).toContain('"Ada"')
        expect(pre!.textContent).toContain('"count"')
        expect(pre!.textContent).toContain('42')
    })

    it('emits keys, strings, and numbers as styled spans (color set inline)', () => {
        const { container } = renderWithTheme(<JsonBlock value={{ k: 'v', n: 1 }} isDarkMode={false} />)
        const keySpan = Array.from(container.querySelectorAll('span')).find((el) => el.textContent === '"k":')
        const stringSpan = Array.from(container.querySelectorAll('span')).find((el) => el.textContent === '"v"')
        const numberSpan = Array.from(container.querySelectorAll('span')).find((el) => el.textContent === '1')
        expect(keySpan?.style.color).toBeTruthy()
        expect(stringSpan?.style.color).toBeTruthy()
        expect(numberSpan?.style.color).toBeTruthy()
        // Punctuation tokens (the leading `{`, whitespace, comma, etc.) carry
        // no color so they pick up the inherited text color.
        const punctuationSpan = Array.from(container.querySelectorAll('span')).find((el) => el.textContent?.trim() === '{')
        expect(punctuationSpan?.style.color).toBe('')
    })

    it('uses different colors in dark vs light mode for the same value', () => {
        const { container: light } = renderWithTheme(<JsonBlock value={{ n: 1 }} isDarkMode={false} />)
        const { container: dark } = renderWithTheme(<JsonBlock value={{ n: 1 }} isDarkMode={true} />, true)
        const lightNum = Array.from(light.querySelectorAll('span')).find((el) => el.textContent === '1')
        const darkNum = Array.from(dark.querySelectorAll('span')).find((el) => el.textContent === '1')
        expect(lightNum?.style.color).toBeTruthy()
        expect(darkNum?.style.color).toBeTruthy()
        expect(lightNum?.style.color).not.toBe(darkNum?.style.color)
    })

    it('round-trips arrays as nested JSON', () => {
        const { container } = renderWithTheme(<JsonBlock value={{ items: [1, 'two', true, null] }} isDarkMode={false} />)
        const text = container.querySelector('pre')!.textContent
        expect(text).toContain('"items"')
        expect(text).toContain('1')
        expect(text).toContain('"two"')
        expect(text).toContain('true')
        expect(text).toContain('null')
    })

    describe('maxHeight (PARITY: legacy JSONViewer default)', () => {
        // MUI's `sx` resolves to emotion class names, not inline styles, so
        // jsdom can't read the computed pixel value directly. Instead we
        // compare the generated className against an explicit-value control:
        // identical class → identical sx → identical maxHeight.
        const containerClass = (ui: ReactElement) => (renderWithTheme(ui).container.firstChild as HTMLElement).className

        it('applies the 400 default when no maxHeight is provided', () => {
            const defaultClass = containerClass(<JsonBlock value={{ k: 1 }} isDarkMode={false} />)
            const explicit400 = containerClass(<JsonBlock value={{ k: 1 }} isDarkMode={false} maxHeight={400} />)
            expect(defaultClass).toBe(explicit400)
        })

        it('emits a different class when an explicit maxHeight overrides the default', () => {
            const defaultClass = containerClass(<JsonBlock value={{ k: 1 }} isDarkMode={false} />)
            const overridden = containerClass(<JsonBlock value={{ k: 1 }} isDarkMode={false} maxHeight={200} />)
            expect(overridden).not.toBe(defaultClass)
        })

        it('accepts string maxHeight values', () => {
            // String values like "50vh" would be common for responsive layouts.
            // Just confirm it doesn't crash and produces a stable class.
            const a = containerClass(<JsonBlock value={{ k: 1 }} isDarkMode={false} maxHeight='50vh' />)
            const b = containerClass(<JsonBlock value={{ k: 1 }} isDarkMode={false} maxHeight='50vh' />)
            expect(a).toBe(b)
        })
    })
})

describe('JsonPrimitive', () => {
    it('renders a string primitive wrapped in quotes', () => {
        renderWithTheme(<JsonPrimitive value='hello' isDarkMode={false} />)
        expect(screen.getByText('"hello"')).toBeInTheDocument()
    })

    it('renders a number primitive without quotes', () => {
        renderWithTheme(<JsonPrimitive value={42} isDarkMode={false} />)
        expect(screen.getByText('42')).toBeInTheDocument()
    })

    it('renders a boolean primitive', () => {
        renderWithTheme(<JsonPrimitive value={true} isDarkMode={false} />)
        expect(screen.getByText('true')).toBeInTheDocument()
    })

    it('renders null as the literal "null"', () => {
        renderWithTheme(<JsonPrimitive value={null} isDarkMode={false} />)
        expect(screen.getByText('null')).toBeInTheDocument()
    })

    it('renders inside a <pre> wrapped by a bordered Box (visual frame for primitives)', () => {
        // The bordered wrapper is what gives primitive values their nested
        // "TextField-style" frame inside Agent message bubbles. Color is
        // applied via MUI's sx prop (emotion class) so we don't assert on
        // the computed color directly — JsonBlock spans cover that.
        const { container } = renderWithTheme(<JsonPrimitive value={42} isDarkMode={false} />)
        expect(container.querySelector('pre')).not.toBeNull()
    })
})
