import MainCard from '@/ui-component/cards/MainCard'
import { Box, Stack, Typography } from '@mui/material'
import contactSupport from '@/assets/images/contact_support.svg'
import { StyledButton } from '@/ui-component/button/StyledButton'

// i18n
import { useTranslation } from 'react-i18next'

// ==============================|| License Expired Page ||============================== //

const LicenseExpired = () => {
    const { t } = useTranslation()
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
                        <Box sx={{ p: 2, height: 'auto', mb: 4 }}>
                            <img style={{ objectFit: 'cover', height: '16vh', width: 'auto' }} src={contactSupport} alt='contact support' />
                        </Box>
                        <Typography sx={{ mb: 2 }} variant='h4' component='div' fontWeight='bold'>
                            {t('auth.expired.expired')}
                        </Typography>
                        <Typography variant='body1' component='div' sx={{ mb: 2 }}>
                            {t('auth.expired.contact')}
                        </Typography>
                        <a href='mailto:support@flowiseai.com'>
                            <StyledButton sx={{ px: 2, py: 1 }}>{t('auth.actions.contact')}</StyledButton>
                        </a>
                    </Stack>
                </Box>
            </MainCard>
        </>
    )
}

export default LicenseExpired
