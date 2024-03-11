import { styled } from '@mui/material/styles'
import { Button } from '@mui/material'
import MuiToggleButton from '@mui/material/ToggleButton'

export const StyledButton = styled(Button)(({ theme, color = 'primary' }) => ({
    // backgroundColor: theme.palette[color].main,
    background: "#469DBB",
    color: '#fff',
    borderRadius: "0px",
    '&:disabled': {backgroundColor: theme.palette.primary.isDisable},
    '&:hover': {
        // backgroundColor: theme.palette[color].main,
        backgroundColor: "#2398c1",
        backgroundImage: `linear-gradient(rgb(0 0 0/10%) 0 0)`
    }
}))

export const StyledToggleButton = styled(MuiToggleButton)(({ theme, color = 'primary' }) => ({
    '&.Mui-selected, &.Mui-selected:hover': {
        color: 'white',
        backgroundColor: theme.palette[color].main
    }
}))
