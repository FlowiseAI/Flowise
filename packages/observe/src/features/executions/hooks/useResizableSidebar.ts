import { useCallback, useEffect, useRef, useState } from 'react'

interface UseResizableSidebarOptions {
    /** Width to use when the user has not yet dragged the handle. */
    defaultWidth: number
    /** Minimum width (in px) the user can drag the sidebar to. */
    minWidth: number
    /** Maximum width (in px) the user can drag the sidebar to. */
    maxWidth: number
    /**
     * When true, dragging left grows the panel (and dragging right shrinks it).
     * Use for right-anchored panels like a right-side `<Drawer>` whose handle
     * sits on its LEFT edge. Defaults to false (left-anchored: drag right grows).
     */
    inverted?: boolean
}

interface UseResizableSidebarResult {
    width: number
    onMouseDown: (e: React.MouseEvent) => void
}

/**
 * Drag-to-resize behavior for a horizontally-resizable sidebar. The width
 * follows `defaultWidth` (i.e., the viewport breakpoint) until the user drags
 * the handle, after which the width sticks to their choice and stops
 * reacting to viewport changes.
 *
 * Encapsulates: width state, drag-state refs, document-level mousemove /
 * mouseup listeners, and cleanup on unmount.
 */
export function useResizableSidebar({
    defaultWidth,
    minWidth,
    maxWidth,
    inverted = false
}: UseResizableSidebarOptions): UseResizableSidebarResult {
    const [width, setWidth] = useState(defaultWidth)
    const [hasUserResized, setHasUserResized] = useState(false)
    const isDragging = useRef(false)
    const dragStartX = useRef(0)
    const dragStartWidth = useRef(defaultWidth)

    useEffect(() => {
        if (hasUserResized) return
        setWidth(defaultWidth)
    }, [defaultWidth, hasUserResized])

    const handleMouseMove = useCallback(
        (e: MouseEvent) => {
            if (!isDragging.current) return
            const delta = e.clientX - dragStartX.current
            const adjusted = inverted ? -delta : delta
            const next = Math.min(maxWidth, Math.max(minWidth, dragStartWidth.current + adjusted))
            setWidth(next)
        },
        [maxWidth, minWidth, inverted]
    )

    const handleMouseUp = useCallback(() => {
        isDragging.current = false
        document.removeEventListener('mousemove', handleMouseMove)
        document.removeEventListener('mouseup', handleMouseUp)
    }, [handleMouseMove])

    const onMouseDown = useCallback(
        (e: React.MouseEvent) => {
            isDragging.current = true
            dragStartX.current = e.clientX
            dragStartWidth.current = width
            setHasUserResized(true)
            document.addEventListener('mousemove', handleMouseMove)
            document.addEventListener('mouseup', handleMouseUp)
        },
        [width, handleMouseMove, handleMouseUp]
    )

    useEffect(() => {
        return () => {
            document.removeEventListener('mousemove', handleMouseMove)
            document.removeEventListener('mouseup', handleMouseUp)
        }
    }, [handleMouseMove, handleMouseUp])

    return { width, onMouseDown }
}
