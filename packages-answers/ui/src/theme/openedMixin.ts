import type { Theme, CSSObject } from '@mui/material/styles'

interface OpenedMixinProps {
    theme: Theme
    width?: number
    maxWidth?: number
}

const openedMixin = ({ theme, width = 200, maxWidth }: OpenedMixinProps): CSSObject => {
    const cssMaxWidth: number = maxWidth ?? width

    return {
        width: width,
        maxWidth: cssMaxWidth,
        transition: theme.transitions.create('width', {
            easing: theme.transitions.easing.sharp,
            duration: theme.transitions.duration.enteringScreen
        }),
        overflowX: 'hidden'
    }
}

export default openedMixin
