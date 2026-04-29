import type { ComponentType } from 'react'

import { Fab, FabProps } from '@mui/material'
import { styled } from '@mui/material/styles'

import { tokens } from '@/core/theme/tokens'

export interface StyledFabProps extends FabProps {
    gradient?: boolean
}

/**
 * Styled floating action button with hover effects
 * Supports gradient background for special actions like Generate
 */
export const StyledFab: ComponentType<StyledFabProps> = styled(Fab, {
    shouldForwardProp: (prop) => prop !== 'gradient'
})<StyledFabProps>(({ theme, color = 'primary', gradient }) => ({
    color: 'white',
    backgroundColor: gradient
        ? undefined
        : theme.palette[color as 'primary' | 'secondary' | 'error' | 'warning' | 'info' | 'success']?.main || theme.palette.primary.main,
    background: gradient ? tokens.colors.gradients.generate.default : undefined,
    '&:hover': {
        backgroundColor: gradient
            ? undefined
            : theme.palette[color as 'primary' | 'secondary' | 'error' | 'warning' | 'info' | 'success']?.main ||
              theme.palette.primary.main,
        background: gradient ? tokens.colors.gradients.generate.hover : undefined,
        backgroundImage: gradient ? undefined : 'linear-gradient(rgb(0 0 0/10%) 0 0)'
    }
}))

export default StyledFab
