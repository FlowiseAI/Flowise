import { styled } from '@mui/material/styles'
import { Button } from '@mui/material'
import MuiToggleButton from '@mui/material/ToggleButton'

export const StyledButton = styled(Button)(() => ({
  borderRadius: 12,
  textTransform: 'none',
  fontWeight: 600,
  transition: 'all .25s ease',
  paddingLeft: 16,
  paddingRight: 16,

  // Text & icon color (follows your sidebar theme vars)
  color: 'var(--sidebar-item-active-text)',
  background:
    'linear-gradient(180deg, var(--sidebar-item-gradient-from), var(--sidebar-item-gradient-to))',
  border: '1px solid var(--sidebar-item-border)',
  boxShadow:
    '0 1px 2px rgba(0,0,0,.35), inset 0 1px 0 rgba(255,255,255,.25), inset 0 -2px 0 rgba(0,0,0,.35)',

  // ✨ ensure icons inherit the same color and have ZERO background
  '& .MuiButton-startIcon, & .MuiButton-endIcon': {
    background: 'transparent !important',
    boxShadow: 'none !important',
    borderRadius: 0,
    padding: 0,
    marginLeft: 8,
    marginRight: 0
  },
  '& .MuiButton-startIcon svg, & .MuiButton-endIcon svg, & svg': {
    color: 'currentColor',
    stroke: 'currentColor',
    fill: 'none',
    background: 'transparent !important',
    boxShadow: 'none !important'
  },

  '&:hover': {
    background:
      'linear-gradient(180deg, var(--sidebar-item-gradient-from), var(--sidebar-item-gradient-to))',
    opacity: 0.92
  },
  '&.Mui-disabled': {
    opacity: 0.6,
    pointerEvents: 'none'
  }
}))

export const StyledToggleButton = styled(MuiToggleButton)(() => ({
  borderRadius: 10,
  textTransform: 'none',
  transition: 'all .2s ease',
  color: 'var(--sidebar-item-inactive-text)',
  border: '1px solid transparent',
  '& svg': {
    color: 'currentColor',
    stroke: 'currentColor',
    fill: 'none',
    background: 'transparent !important',
    boxShadow: 'none !important'
  },
  '&:hover': {
    background: 'var(--sidebar-item-hover-bg)',
    color: 'var(--sidebar-item-hover-text)'
  },
  '&.Mui-selected, &.Mui-selected:hover': {
    color: 'var(--sidebar-item-active-text)',
    background:
      'linear-gradient(180deg, var(--sidebar-item-gradient-from), var(--sidebar-item-gradient-to))',
    borderColor: 'var(--sidebar-item-border)',
    boxShadow:
      '0 1px 2px rgba(0,0,0,.35), inset 0 1px 0 rgba(255,255,255,.25), inset 0 -2px 0 rgba(0,0,0,.35)'
  }
}))
