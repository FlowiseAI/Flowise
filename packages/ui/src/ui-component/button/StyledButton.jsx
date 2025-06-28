import { styled } from '@mui/material/styles'
import { Button } from '@mui/material'

export const StyledButton = styled(Button)(({ theme, color = 'primary' }) => ({
    color: 'white',
    backgroundColor: theme.palette[color].main,
    '&:hover': {
        backgroundColor: theme.palette[color].main,
        backgroundImage: `linear-gradient(rgb(0 0 0/10%) 0 0)`
    }
}))
