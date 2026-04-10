import { type RefObject, useEffect, useState } from 'react'

import { tokens } from '@/core/theme/tokens'

/**
 * Calculates the maximum height for a drawer based on its rendered position in the viewport.
 * Recalculates on window resize.
 *
 * @param open - Whether the drawer is currently open
 * @param ref - Ref to the element whose position is measured
 * @param bottomPadding - Padding from the viewport bottom (defaults to tokens.spacing.xxl)
 */
export function useDrawerMaxHeight(
    open: boolean,
    ref: RefObject<HTMLElement | null>,
    bottomPadding = tokens.spacing.xxl
): number | undefined {
    const [maxHeight, setMaxHeight] = useState<number | undefined>(undefined)

    useEffect(() => {
        if (open && ref.current) {
            const update = () => {
                if (ref.current) {
                    const rect = ref.current.getBoundingClientRect()
                    setMaxHeight(window.innerHeight - rect.top - bottomPadding)
                }
            }
            // Allow Popper to position first, then measure
            requestAnimationFrame(update)
            window.addEventListener('resize', update)
            return () => window.removeEventListener('resize', update)
        }
        setMaxHeight(undefined)
    }, [open, ref, bottomPadding])

    return maxHeight
}
