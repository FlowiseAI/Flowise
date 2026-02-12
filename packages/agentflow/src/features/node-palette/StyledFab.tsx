import type { ComponentType } from 'react'

import { Fab, FabProps } from '@mui/material'
import { styled } from '@mui/material/styles'

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
    background: gradient ? 'linear-gradient(45deg, #FF6B6B 30%, #FF8E53 90%)' : undefined,
    '&:hover': {
        backgroundColor: gradient
            ? undefined
            : theme.palette[color as 'primary' | 'secondary' | 'error' | 'warning' | 'info' | 'success']?.main ||
              theme.palette.primary.main,
        background: gradient ? 'linear-gradient(45deg, #FF8E53 30%, #FF6B6B 90%)' : undefined,
        backgroundImage: gradient ? undefined : 'linear-gradient(rgb(0 0 0/10%) 0 0)'
    }
}))

export default StyledFab
