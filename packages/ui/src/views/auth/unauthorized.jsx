import MainCard from '@/ui-component/cards/MainCard'
import { Box, Stack, Typography } from '@mui/material'
import unauthorizedSVG from '@/assets/images/unauthorized.svg'
import { StyledButton } from '@/ui-component/button/StyledButton'
import { Link } from 'react-router-dom'
import { useSelector } from 'react-redux'

// i18n
import { useTranslation } from 'react-i18next'

// ==============================|| UnauthorizedPage ||============================== //

const UnauthorizedPage = () => {
    const { t } = useTranslation()
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
                            {t('auth.unauthorized.forbidden')}
                        </Typography>
                        <Typography variant='body1' component='div' sx={{ mb: 2 }}>
                            {t('auth.unauthorized.permission')}
                        </Typography>
                        {currentUser ? (
                            <Link to='/'>
                                <StyledButton sx={{ px: 2, py: 1 }}>{t('auth.actions.backHome')}</StyledButton>
                            </Link>
                        ) : (
                            <Link to='/login'>
                                <StyledButton sx={{ px: 2, py: 1 }}>{t('auth.actions.backLogin')}</StyledButton>
                            </Link>
                        )}
                    </Stack>
                </Box>
            </MainCard>
        </>
    )
}

export default UnauthorizedPage
