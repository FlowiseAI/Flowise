import MainCard from '@/ui-component/cards/MainCard'
import { Box, Stack, Typography } from '@mui/material'
import unauthorizedSVG from '@/assets/images/unauthorized.svg'
import { StyledButton } from '@/ui-component/button/StyledButton'
import { Link } from 'react-router-dom'
import { useSelector } from 'react-redux'

// ==============================|| UnauthorizedPage ||============================== //

const UnauthorizedPage = () => {
    const currentUser = useSelector((state) => state.auth.user)

    return (
        <>
            <MainCard>
                <Box
                    sx={{
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'center',
                        height: 'calc(100vh - 210px)'
                    }}
                >
                    <Stack
                        sx={{
                            alignItems: 'center',
                            justifyContent: 'center'
                        }}
                        flexDirection='column'
                    >
                        <Box sx={{ p: 2, height: 'auto' }}>
                            <img
                                style={{ objectFit: 'cover', height: '20vh', width: 'auto' }}
                                src={unauthorizedSVG}
                                alt='unauthorizedSVG'
                            />
                        </Box>
                        <Typography sx={{ mb: 2 }} variant='h4' component='div' fontWeight='bold'>
                            403 Forbidden
                        </Typography>
                        <Typography variant='body1' component='div' sx={{ mb: 2 }}>
                            You do not have permission to access this page.
                        </Typography>
                        {currentUser ? (
                            <Link to='/'>
                                <StyledButton sx={{ px: 2, py: 1 }}>Back to Home</StyledButton>
                            </Link>
                        ) : (
                            <Link to='/login'>
                                <StyledButton sx={{ px: 2, py: 1 }}>Back to Login</StyledButton>
                            </Link>
                        )}
                    </Stack>
                </Box>
            </MainCard>
        </>
    )
}

export default UnauthorizedPage
