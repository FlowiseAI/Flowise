import { act, fireEvent, renderHook } from '@testing-library/react'

import { useResizableSidebar } from './useResizableSidebar'

const baseOptions = {
    defaultWidth: 300,
    minWidth: 180,
    maxWidth: 480
}

/** Synthesizes a real `MouseEvent` since renderHook calls outside the DOM. */
function dispatchMouseMove(clientX: number) {
    const evt = new MouseEvent('mousemove', { clientX, bubbles: true })
    document.dispatchEvent(evt)
}

function dispatchMouseUp() {
    document.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }))
}

describe('useResizableSidebar', () => {
    it('initializes width to defaultWidth', () => {
        const { result } = renderHook(() => useResizableSidebar(baseOptions))
        expect(result.current.width).toBe(300)
    })

    it('follows defaultWidth changes until the user drags the handle', () => {
        const { result, rerender } = renderHook((opts: typeof baseOptions) => useResizableSidebar(opts), { initialProps: baseOptions })
        expect(result.current.width).toBe(300)

        // Viewport breakpoint flipped to narrow — width should track the new default.
        rerender({ ...baseOptions, defaultWidth: 220 })
        expect(result.current.width).toBe(220)

        // Back to wide — same.
        rerender(baseOptions)
        expect(result.current.width).toBe(300)
    })

    it('locks to the dragged width and ignores subsequent defaultWidth changes', () => {
        const { result, rerender } = renderHook((opts: typeof baseOptions) => useResizableSidebar(opts), { initialProps: baseOptions })

        // Drag the handle from x=500 to x=600 (delta +100). Width should jump to 400.
        act(() => {
            result.current.onMouseDown({ clientX: 500 } as unknown as React.MouseEvent)
        })
        act(() => dispatchMouseMove(600))
        act(() => dispatchMouseUp())
        expect(result.current.width).toBe(400)

        // Now flip the viewport-driven default — the user-locked width must persist.
        rerender({ ...baseOptions, defaultWidth: 220 })
        expect(result.current.width).toBe(400)
    })

    it('clamps the dragged width to [minWidth, maxWidth]', () => {
        const { result } = renderHook(() => useResizableSidebar(baseOptions))

        // Drag way too far right (delta +1000) — should clamp to maxWidth (480).
        act(() => {
            result.current.onMouseDown({ clientX: 0 } as unknown as React.MouseEvent)
        })
        act(() => dispatchMouseMove(1000))
        expect(result.current.width).toBe(480)

        // Drag way too far left (delta -10000) — should clamp to minWidth (180).
        act(() => dispatchMouseMove(-10000))
        expect(result.current.width).toBe(180)

        act(() => dispatchMouseUp())
    })

    it('stops responding to mousemove after mouseup', () => {
        const { result } = renderHook(() => useResizableSidebar(baseOptions))

        act(() => {
            result.current.onMouseDown({ clientX: 100 } as unknown as React.MouseEvent)
        })
        act(() => dispatchMouseMove(200))
        expect(result.current.width).toBe(400)

        act(() => dispatchMouseUp())

        // Subsequent mousemove (without a fresh mousedown) must be ignored.
        act(() => dispatchMouseMove(900))
        expect(result.current.width).toBe(400)
    })

    it('removes document-level listeners on unmount', () => {
        const removeSpy = jest.spyOn(document, 'removeEventListener')
        const { unmount } = renderHook(() => useResizableSidebar(baseOptions))
        unmount()
        const removed = removeSpy.mock.calls.map(([type]) => type)
        expect(removed).toEqual(expect.arrayContaining(['mousemove', 'mouseup']))
        removeSpy.mockRestore()
    })

    describe('inverted: true (right-anchored panel like a Drawer)', () => {
        const invertedOptions = { ...baseOptions, inverted: true }

        it('grows the width when the cursor moves left', () => {
            const { result } = renderHook(() => useResizableSidebar(invertedOptions))
            // Start drag at x=500 with width=300 (default).
            act(() => {
                result.current.onMouseDown({ clientX: 500 } as unknown as React.MouseEvent)
            })
            // Cursor moves to x=400 (delta = -100). Inverted: width grows by 100.
            act(() => dispatchMouseMove(400))
            expect(result.current.width).toBe(400)
            act(() => dispatchMouseUp())
        })

        it('shrinks the width when the cursor moves right', () => {
            const { result } = renderHook(() => useResizableSidebar({ ...invertedOptions, defaultWidth: 400 }))
            act(() => {
                result.current.onMouseDown({ clientX: 500 } as unknown as React.MouseEvent)
            })
            // Cursor moves to x=600 (delta = +100). Inverted: width shrinks by 100.
            act(() => dispatchMouseMove(600))
            expect(result.current.width).toBe(300)
            act(() => dispatchMouseUp())
        })

        it('still clamps to [minWidth, maxWidth]', () => {
            const { result } = renderHook(() => useResizableSidebar(invertedOptions))
            act(() => {
                result.current.onMouseDown({ clientX: 500 } as unknown as React.MouseEvent)
            })
            // Drag far left → would give a huge width; clamps to maxWidth (480).
            act(() => dispatchMouseMove(-10000))
            expect(result.current.width).toBe(480)
            // Drag far right → would give a tiny/negative width; clamps to minWidth (180).
            act(() => dispatchMouseMove(10000))
            expect(result.current.width).toBe(180)
            act(() => dispatchMouseUp())
        })
    })

    it('does not update width when mousemove fires without a prior mousedown', () => {
        // Edge case: a stray document-level mousemove (e.g. another component
        // dispatched it) must not move the sidebar before the user drags.
        const { result } = renderHook(() => useResizableSidebar(baseOptions))
        // No onMouseDown — handler exits early via the isDragging ref guard.
        // (Listeners aren't attached anyway, but we exercise the guard for safety.)
        act(() => dispatchMouseMove(900))
        expect(result.current.width).toBe(300)

        // Sanity: fireEvent works the same way.
        act(() => {
            fireEvent.mouseMove(document, { clientX: 900 })
        })
        expect(result.current.width).toBe(300)
    })
})
