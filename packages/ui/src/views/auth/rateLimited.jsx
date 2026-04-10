import { Box, Button, Stack, Typography } from '@mui/material'
import { Link, useLocation } from 'react-router-dom'
import unauthorizedSVG from '@/assets/images/unauthorized.svg'
import MainCard from '@/ui-component/cards/MainCard'

// i18n
import { useTranslation } from 'react-i18next'

// ==============================|| RateLimitedPage ||============================== //

const RateLimitedPage = () => {
    const { t } = useTranslation()
    const location = useLocation()

    const retryAfter = location.state?.retryAfter || 60

    return (
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
                        <img style={{ objectFit: 'cover', height: '20vh', width: 'auto' }} src={unauthorizedSVG} alt='rateLimitedSVG' />
                    </Box>
                    <Typography sx={{ mb: 2 }} variant='h4' component='div' fontWeight='bold'>
                        {t('auth.rateLimit.title')}
                    </Typography>
                    <Typography variant='body1' component='div' sx={{ mb: 2, textAlign: 'center' }}>
                        {t('auth.rateLimit.description', { retryAfter: retryAfter })}
                    </Typography>
                    <Link to='/'>
                        <Button variant='contained' color='primary'>
                            {t('auth.actions.back')}
                        </Button>
                    </Link>
                </Stack>
            </Box>
        </MainCard>
    )
}

export default RateLimitedPage
