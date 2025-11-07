import { useEffect, useState } from 'react'
import MainCard from '@/ui-component/cards/MainCard'
import { Box, Stack, Typography, LinearProgress } from '@mui/material'
import unauthorizedSVG from '@/assets/images/unauthorized.svg'
import { StyledButton } from '@/ui-component/button/StyledButton'
import { useNavigate, useLocation } from 'react-router-dom'
import { useSelector } from 'react-redux'

// ==============================|| RateLimitedPage ||============================== //

const RateLimitedPage = () => {
    const navigate = useNavigate()
    const location = useLocation()
    const currentUser = useSelector((state) => state.auth.user)
    
    const retryAfter = location.state?.retryAfter || 60
    const [countdown, setCountdown] = useState(retryAfter)
    const [canRetry, setCanRetry] = useState(false)

    useEffect(() => {
        if (countdown <= 0) {
            setCanRetry(true)
            return
        }

        const timer = setInterval(() => {
            setCountdown((prev) => {
                if (prev <= 1) {
                    setCanRetry(true)
                    return 0
                }
                return prev - 1
            })
        }, 1000)

        return () => clearInterval(timer)
    }, [countdown])

    const handleRetry = () => {
        navigate(-1)
    }

    const handleGoHome = () => {
        navigate('/')
    }

    const progress = ((retryAfter - countdown) / retryAfter) * 100

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
                            justifyContent: 'center',
                            maxWidth: '500px'
                        }}
                        flexDirection='column'
                    >
                        <Box sx={{ p: 2, height: 'auto' }}>
                            <img
                                style={{ objectFit: 'cover', height: '20vh', width: 'auto' }}
                                src={unauthorizedSVG}
                                alt='rateLimitedSVG'
                            />
                        </Box>
                        <Typography sx={{ mb: 2 }} variant='h4' component='div' fontWeight='bold'>
                            429 Too Many Requests
                        </Typography>
                        <Typography variant='body1' component='div' sx={{ mb: 2, textAlign: 'center' }}>
                            You've made too many requests in a short period of time. Please wait a moment before trying again.
                        </Typography>
                        
                        {!canRetry && (
                            <Box sx={{ width: '100%', mb: 3 }}>
                                <Typography variant='body2' component='div' sx={{ mb: 1, textAlign: 'center', fontWeight: 500 }}>
                                    Please wait {countdown} second{countdown !== 1 ? 's' : ''}
                                </Typography>
                                <LinearProgress variant='determinate' value={progress} sx={{ height: 8, borderRadius: 1 }} />
                            </Box>
                        )}

                        <Stack direction='row' spacing={2}>
                            <StyledButton 
                                sx={{ px: 2, py: 1 }} 
                                onClick={handleRetry}
                                disabled={!canRetry}
                            >
                                Try Again
                            </StyledButton>
                            {currentUser && (
                                <StyledButton 
                                    sx={{ px: 2, py: 1 }} 
                                    onClick={handleGoHome}
                                    variant='outlined'
                                >
                                    Back to Home
                                </StyledButton>
                            )}
                        </Stack>
                    </Stack>
                </Box>
            </MainCard>
        </>
    )
}

export default RateLimitedPage
