import { styled } from '@mui/material/styles'
import { Fab } from '@mui/material'

export const StyledFab = styled(Fab)(() => ({
  color: 'var(--sidebar-item-active-text)',
  background: 'linear-gradient(180deg, var(--sidebar-item-gradient-from), var(--sidebar-item-gradient-to))',
  border: '1px solid var(--sidebar-item-border)',
  '&:hover': {
    background: 'linear-gradient(180deg, var(--sidebar-item-gradient-from), var(--sidebar-item-gradient-to))',
    opacity: 0.9
  }
}))
