import { useMemo } from 'react'

/**
 * Drawer-width resolution for the right-anchored execution-detail drawer.
 *
 * `MIN_DRAWER_WIDTH_PX` and `DRAWER_LEFT_GAP_PX` come from legacy parity:
 * the legacy view leaves ~400px of background visible to the LEFT of the
 * drawer (`drawerWidth = window.innerWidth - 400`).
 *
 * `SSR_*_FALLBACK_PX` values are used when `window` is undefined (server-side
 * render) — pinned to common desktop dimensions so the drawer has a reasonable
 * size before hydration.
 */
const MIN_DRAWER_WIDTH_PX = 400
const DRAWER_LEFT_GAP_PX = 400
const SSR_MAX_WIDTH_FALLBACK_PX = 1920
const SSR_DEFAULT_WIDTH_FALLBACK_PX = 1024

export interface DrawerWidthOverrides {
    defaultWidth?: number
    minWidth?: number
    maxWidth?: number
}

export interface ResolvedDrawerWidths {
    minWidth: number
    maxWidth: number
    defaultWidth: number
}

/**
 * Resolves the drawer width triple from optional consumer overrides + the
 * current viewport. The returned `defaultWidth` is always clamped into
 * `[minWidth, maxWidth]` so an inconsistent override (e.g.
 * `defaultWidth=200, minWidth=400`) doesn't initialize below the floor.
 *
 * Memoized on the three override fields, so passing a fresh `drawer` object
 * literal each render does NOT recompute (or shake the downstream
 * `useResizableSidebar` width state).
 */
export function useDrawerWidths(overrides: DrawerWidthOverrides | undefined): ResolvedDrawerWidths {
    const dwDefault = overrides?.defaultWidth
    const dwMin = overrides?.minWidth
    const dwMax = overrides?.maxWidth
    return useMemo(() => {
        const viewportWidth = typeof window === 'undefined' ? undefined : window.innerWidth
        const maxWidth = dwMax ?? viewportWidth ?? SSR_MAX_WIDTH_FALLBACK_PX
        // Cap min to max so a sub-400px viewport doesn't invert the bounds.
        const minWidth = Math.min(dwMin ?? MIN_DRAWER_WIDTH_PX, maxWidth)
        const raw =
            dwDefault ??
            (viewportWidth !== undefined ? Math.max(minWidth, viewportWidth - DRAWER_LEFT_GAP_PX) : SSR_DEFAULT_WIDTH_FALLBACK_PX)
        const defaultWidth = Math.min(maxWidth, Math.max(minWidth, raw))
        return { minWidth, maxWidth, defaultWidth }
    }, [dwDefault, dwMin, dwMax])
}
