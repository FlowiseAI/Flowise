// material-ui
import { styled } from '@mui/material/styles'

// project imports
import MainCard from './MainCard'

const NodeCardWrapper = styled(MainCard)(({ theme }) => ({
    background: theme.palette.card.main,
    color: theme.darkTextPrimary,
    border: `1px solid ${theme.customization?.isDarkMode ? theme.palette.grey[900] + 25 : theme.palette.primary[200] + 75}`,
    width: '300px',
    height: 'auto',
    padding: '10px',
    boxShadow: `rgba(0, 0, 0, 0.05) 0px 0px 0px 1px`,
    '&:hover': {
        borderColor: theme.palette.primary.main,
        boxShadow: `rgba(0, 0, 0, 0.1) 0px 10px 15px -3px, rgba(0, 0, 0, 0.05) 0px 4px 6px -2px`
    }
}))

export default NodeCardWrapper
