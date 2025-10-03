import { useEffect, useState, useRef } from 'react'
import { useTheme } from '@mui/material/styles'
import useMediaQuery from '@mui/material/useMediaQuery'

export const useRailGuardPadding = (ref) => {
    const theme = useTheme()
    const upMd = useMediaQuery(theme.breakpoints.up('md'))
    const [pad, setPad] = useState(0)

    useEffect(() => {
        if (!upMd) {
            setPad(0)
            return
        }

        const SAFE_PAD = 8 // tiny gap so cards never touch the rail
        const COLLAPSE_MAX = 120 // treat widths <= this as the mini-rail

        const measure = () => {
            // Prefer the <nav> container (always there), otherwise drawer paper
            const rail = document.querySelector('nav[aria-label="mailbox folders"]') || document.querySelector('.MuiDrawer-paper')
            const railRect = rail?.getBoundingClientRect()
            const elRect = ref.current?.getBoundingClientRect()
            if (!railRect || !elRect) {
                setPad(0)
                return
            }

            const railWidth = railRect.width || 0
            const isCollapsed = railWidth > 0 && railWidth <= COLLAPSE_MAX

            // Only when collapsed: push content just past the rail’s right edge
            const needed = isCollapsed ? Math.max(0, Math.ceil(railRect.right + SAFE_PAD - elRect.left)) : 0

            setPad(needed)
        }

        measure()

        // React to DOM changes + resizes
        const mo = new MutationObserver(measure)
        mo.observe(document.body, { attributes: true, childList: true, subtree: true })

        let ro
        const target = document.querySelector('nav[aria-label="mailbox folders"]') || document.querySelector('.MuiDrawer-paper')
        if (target && 'ResizeObserver' in window) {
            ro = new ResizeObserver(measure)
            ro.observe(target)
        }

        window.addEventListener('resize', measure)
        return () => {
            window.removeEventListener('resize', measure)
            mo.disconnect()
            if (ro) ro.disconnect()
        }
    }, [upMd, ref])

    return pad
}
