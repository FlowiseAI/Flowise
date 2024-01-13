import Link from '@mui/material/Link'
import Typography from '@mui/material/Typography'
import { createTheme } from '@mui/material/styles'
import { Toolbar, Box, AppBar } from '@mui/material'
import { useTheme } from '@mui/material/styles'
import { useNavigate } from 'react-router-dom'
import Container from '@mui/material/Container'
import SubscribeHeader from './SubscribeHeader'

function Copyright(props) {
    return (
        <Typography variant='body2' color='text.secondary' align='center' {...props}>
            {'Copyright © '}
            <Link color='inherit' href='https://mui.com/'>
                Your Website
            </Link>{' '}
            {new Date().getFullYear()}
            {'.'}
        </Typography>
    )
}

// TODO remove, this demo shouldn't need to reset the theme.

const defaultTheme = createTheme()

export default function SubscribeFull() {
    const theme = useTheme()
    const navigate = useNavigate()

    return (
        <>
            <Box>
                <AppBar
                    enableColorOnDark
                    position='fixed'
                    color='inherit'
                    elevation={1}
                    sx={{
                        bgcolor: theme.palette.background.default
                    }}
                >
                    <Toolbar>
                        <SubscribeHeader />
                    </Toolbar>
                </AppBar>
                <Container disableGutters maxWidth='sm' component='main' sx={{ pt: 8, pb: 6 }}>
                    <br />
                    <Typography component='h1' variant='h2' align='center' color='text.primary' gutterBottom>
                        Upgrade your plan
                    </Typography>
                    <Typography variant='h5' align='center' color='text.secondary' component='p'>
                        Unlock Endless Possibilities with Our Tailored Subscription Plans
                    </Typography>
                </Container>
                <stripe-pricing-table
                    pricing-table-id='prctbl_1OY8r2CXAyRqT2HGB2ZKxcHs'
                    publishable-key='pk_test_51OY7bDCXAyRqT2HGc95qen8SDelmPliy5iSmHcHzqMWNPftkOGSaZCKyIXkcBZMRjczPZ2OqM6NkCfGWEdFHYDEg00NEmDQivg'
                ></stripe-pricing-table>
            </Box>
        </>
    )
}
