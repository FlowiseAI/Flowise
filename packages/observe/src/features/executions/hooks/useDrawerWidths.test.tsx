import { renderHook } from '@testing-library/react'

import { useDrawerWidths } from './useDrawerWidths'

const originalInnerWidth = Object.getOwnPropertyDescriptor(window, 'innerWidth')

function setViewport(value: number | undefined) {
    Object.defineProperty(window, 'innerWidth', { value, writable: true, configurable: true })
}

afterEach(() => {
    if (originalInnerWidth) Object.defineProperty(window, 'innerWidth', originalInnerWidth)
})

describe('useDrawerWidths', () => {
    describe('without overrides', () => {
        it('uses the legacy 400-floor and the viewport width as max', () => {
            setViewport(1600)
            const { result } = renderHook(() => useDrawerWidths(undefined))
            expect(result.current.minWidth).toBe(400)
            expect(result.current.maxWidth).toBe(1600)
        })

        it('computes defaultWidth as `viewport - 400` when there is room', () => {
            setViewport(1600)
            const { result } = renderHook(() => useDrawerWidths(undefined))
            expect(result.current.defaultWidth).toBe(1200)
        })

        it('floors defaultWidth to minWidth when the viewport is narrower than the legacy gap', () => {
            // viewportWidth (500) - 400 = 100, well below the 400 floor.
            setViewport(500)
            const { result } = renderHook(() => useDrawerWidths(undefined))
            expect(result.current.defaultWidth).toBe(400)
        })

        it('caps minWidth to maxWidth on tiny viewports so the drawer never exceeds the screen', () => {
            // On a 300px wide viewport the 400px floor would otherwise produce
            // minWidth > maxWidth, pushing the drawer past the right edge.
            setViewport(300)
            const { result } = renderHook(() => useDrawerWidths(undefined))
            expect(result.current.maxWidth).toBe(300)
            expect(result.current.minWidth).toBe(300)
            expect(result.current.defaultWidth).toBe(300)
        })
    })

    describe('with consumer overrides', () => {
        it('uses minWidth override', () => {
            setViewport(1600)
            const { result } = renderHook(() => useDrawerWidths({ minWidth: 250 }))
            expect(result.current.minWidth).toBe(250)
        })

        it('uses maxWidth override (overrides the viewport-derived max)', () => {
            setViewport(1600)
            const { result } = renderHook(() => useDrawerWidths({ maxWidth: 800 }))
            expect(result.current.maxWidth).toBe(800)
        })

        it('uses defaultWidth override when consistent with min/max', () => {
            setViewport(1600)
            const { result } = renderHook(() => useDrawerWidths({ defaultWidth: 600 }))
            expect(result.current.defaultWidth).toBe(600)
        })

        it('clamps defaultWidth UP to minWidth when the override is below the floor', () => {
            // PARITY: the override is honored as a hint, but the resolved value
            // never initializes below `minWidth` — the drawer would otherwise
            // appear at a width the user can't shrink it back to.
            setViewport(1600)
            const { result } = renderHook(() => useDrawerWidths({ defaultWidth: 200, minWidth: 400 }))
            expect(result.current.defaultWidth).toBe(400)
        })

        it('clamps defaultWidth DOWN to maxWidth when the override exceeds the ceiling', () => {
            setViewport(1600)
            const { result } = renderHook(() => useDrawerWidths({ defaultWidth: 5000, maxWidth: 800 }))
            expect(result.current.defaultWidth).toBe(800)
        })

        it('respects all three overrides simultaneously', () => {
            setViewport(1600)
            const { result } = renderHook(() => useDrawerWidths({ defaultWidth: 700, minWidth: 300, maxWidth: 900 }))
            expect(result.current).toEqual({ defaultWidth: 700, minWidth: 300, maxWidth: 900 })
        })
    })

    describe('SSR-style fallback (window.innerWidth=undefined)', () => {
        // Jsdom always defines `window`, so the `typeof window === 'undefined'`
        // guard branch can't be hit directly. Setting `innerWidth=undefined`
        // exercises the same downstream `??` fallback math (viewportWidth is
        // undefined either way), which is the consumer-visible behavior.
        it('falls back to a 1920 ceiling and a 1024 raw default when viewport is unknown', () => {
            setViewport(undefined)
            const { result } = renderHook(() => useDrawerWidths(undefined))
            expect(result.current.minWidth).toBe(400)
            expect(result.current.maxWidth).toBe(1920)
            expect(result.current.defaultWidth).toBe(1024)
        })

        it('still honors consumer overrides when viewport is unknown', () => {
            setViewport(undefined)
            const { result } = renderHook(() => useDrawerWidths({ minWidth: 300, maxWidth: 1200, defaultWidth: 800 }))
            expect(result.current).toEqual({ minWidth: 300, maxWidth: 1200, defaultWidth: 800 })
        })

        it('clamps the SSR raw default into [min, max] when overrides are tight', () => {
            // SSR raw=1024, but maxWidth override=900 → clamps down to 900.
            setViewport(undefined)
            const { result } = renderHook(() => useDrawerWidths({ maxWidth: 900 }))
            expect(result.current.defaultWidth).toBe(900)
        })
    })

    describe('memoization', () => {
        it('returns the same reference when called with the same override fields', () => {
            setViewport(1600)
            const { result, rerender } = renderHook((overrides) => useDrawerWidths(overrides), {
                initialProps: { defaultWidth: 600 } as { defaultWidth?: number; minWidth?: number; maxWidth?: number }
            })
            const first = result.current
            // A fresh object literal with identical fields must NOT recompute.
            rerender({ defaultWidth: 600 })
            expect(result.current).toBe(first)
        })

        it('recomputes when an override field changes', () => {
            setViewport(1600)
            const { result, rerender } = renderHook((overrides) => useDrawerWidths(overrides), {
                initialProps: { defaultWidth: 600 } as { defaultWidth?: number; minWidth?: number; maxWidth?: number }
            })
            const first = result.current
            rerender({ defaultWidth: 700 })
            expect(result.current).not.toBe(first)
            expect(result.current.defaultWidth).toBe(700)
        })
    })
})
