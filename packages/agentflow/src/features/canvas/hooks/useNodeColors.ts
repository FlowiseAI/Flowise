import { useMemo } from 'react'

import { alpha, darken, lighten } from '@mui/material/styles'

const DEFAULT_NODE_COLOR = '#666666'

export interface UseNodeColorsOptions {
    nodeColor?: string
    selected?: boolean
    isDarkMode: boolean
    isHovered: boolean
}

export interface UseNodeColorsReturn {
    nodeColor: string
    stateColor: string
    backgroundColor: string
}

export function useNodeColors({ nodeColor: rawColor, selected, isDarkMode, isHovered }: UseNodeColorsOptions): UseNodeColorsReturn {
    const nodeColor = rawColor || DEFAULT_NODE_COLOR

    const stateColor = useMemo(() => {
        if (selected) return nodeColor
        if (isHovered) return alpha(nodeColor, 0.8)
        return alpha(nodeColor, 0.5)
    }, [nodeColor, selected, isHovered])

    const backgroundColor = useMemo(() => {
        if (isDarkMode) {
            return isHovered ? darken(nodeColor, 0.7) : darken(nodeColor, 0.8)
        }
        return isHovered ? lighten(nodeColor, 0.8) : lighten(nodeColor, 0.9)
    }, [nodeColor, isDarkMode, isHovered])

    return { nodeColor, stateColor, backgroundColor }
}
