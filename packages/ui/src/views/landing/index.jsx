import { Box, Button, Container, Grid, Stack, Typography, ToggleButton, ToggleButtonGroup, Switch } from '@mui/material'
import ArrowForwardIcon from '@mui/icons-material/ArrowForward'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useState } from 'react'
import { useTheme, styled } from '@mui/material/styles'
// Removed list view icons; not needed for language toggle
import { useDispatch, useSelector } from 'react-redux'
import { SET_DARKMODE } from '@/store/actions'

const Feature = ({ title, description }) => (
    <Stack spacing={1}>
        <Typography variant='h6' fontWeight={700}>
            {title}
        </Typography>
        <Typography variant='body1' color='text.secondary'>
            {description}
        </Typography>
    </Stack>
)

// Styled switch copied from Header to keep visual consistency
const MaterialUISwitch = styled(Switch)(({ theme }) => ({
    width: 62,
    height: 34,
    padding: 7,
    '& .MuiSwitch-switchBase': {
        margin: 1,
        padding: 0,
        transform: 'translateX(6px)',
        '&.Mui-checked': {
            color: '#fff',
            transform: 'translateX(22px)',
            '& .MuiSwitch-thumb:before': {
                backgroundImage: `url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" height="20" width="20" viewBox="0 0 20 20"><path fill="${encodeURIComponent(
                    '#fff'
                )}" d="M4.2 2.5l-.7 1.8-1.8.7 1.8.7.7 1.8.6-1.8L6.7 5l-1.9-.7-.6-1.8zm15 8.3a6.7 6.7 0 11-6.6-6.6 5.8 5.8 0 006.6 6.6z"/></svg>')`
            },
            '& + .MuiSwitch-track': {
                opacity: 1,
                backgroundColor: theme.palette.mode === 'dark' ? '#8796A5' : '#aab4be'
            }
        }
    },
    '& .MuiSwitch-thumb': {
        backgroundColor: theme.palette.mode === 'dark' ? '#003892' : '#001e3c',
        width: 32,
        height: 32,
        '&:before': {
            content: "''",
            position: 'absolute',
            width: '100%',
            height: '100%',
            left: 0,
            top: 0,
            backgroundRepeat: 'no-repeat',
            backgroundPosition: 'center',
            backgroundImage: `url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" height="20" width="20" viewBox="0 0 20 20"><path fill="${encodeURIComponent(
                '#fff'
            )}" d="M9.305 1.667V3.75h1.389V1.667h-1.39zm-4.707 1.95l-.982.982L5.09 6.072l.982-.982-1.473-1.473zm10.802 0L13.927 5.09l.982.982 1.473-1.473-.982-.982zM10 5.139a4.872 4.872 0 00-4.862 4.86A4.872 4.872 0 0010 14.862 4.872 4.872 0 0014.86 10 4.872 4.872 0 0010 5.139zm0 1.389A3.462 3.462 0 0113.471 10a3.462 3.462 0 01-3.473 3.472A3.462 3.462 0 016.527 10 3.462 3.462 0 0110 6.528zM1.665 9.305v1.39h2.083v-1.39H1.666zm14.583 0v1.39h2.084v-1.39h-2.084zM5.09 13.928L3.616 15.4l.982.982 1.473-1.473-.982-.982zm9.82 0l-.982.982 1.473 1.473.982-.982-1.473-1.473zM9.305 16.25v2.083h1.389V16.25h-1.39z"/></svg>')`
        }
    },
    '& .MuiSwitch-track': {
        opacity: 1,
        backgroundColor: theme.palette.mode === 'dark' ? '#8796A5' : '#aab4be',
        borderRadius: 20 / 2
    }
}))

const LandingPage = () => {
    const navigate = useNavigate()
    const { t, i18n } = useTranslation()
    const theme = useTheme()
    const dispatch = useDispatch()
    const customization = useSelector((state) => state.customization)

    // Language toggle (persisted via localStorage)
    const initialLang =
        (typeof window !== 'undefined' && localStorage.getItem('app_lang')) ||
        (i18n.language && i18n.language.split('-')[0]) ||
        'en'
    const [lang, setLang] = useState(initialLang)
    const handleLangToggle = (event, nextLang) => {
        if (!nextLang) return
        setLang(nextLang)
        i18n.changeLanguage(nextLang)
        if (typeof window !== 'undefined') localStorage.setItem('app_lang', nextLang)
    }

    // Dark mode toggle (mirrors Header behavior)
    const [isDark, setIsDark] = useState(customization.isDarkMode)
    const changeDarkMode = () => {
        dispatch({ type: SET_DARKMODE, isDarkMode: !isDark })
        setIsDark((prev) => !prev)
        localStorage.setItem('isDarkMode', !isDark)
    }

    return (
        <Box sx={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
            {/* Top-right quick actions: language toggle and dark mode */}
            <Box sx={{ position: 'fixed', top: 16, right: 24, display: 'flex', alignItems: 'center', gap: 2.5, zIndex: 1200 }}>
                <ToggleButtonGroup
                    sx={{
                        borderRadius: '12px',
                        maxHeight: 40,
                        background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.1) 0%, rgba(255, 255, 255, 0.05) 100%)',
                        backdropFilter: 'blur(10px)',
                        border: '1px solid rgba(255, 255, 255, 0.2)',
                        boxShadow: '0 4px 16px rgba(0, 0, 0, 0.1)'
                    }}
                    value={lang}
                    color='primary'
                    exclusive
                    onChange={handleLangToggle}
                >
                    <ToggleButton
                        sx={{
                            borderColor: 'rgba(255, 255, 255, 0.2)',
                            borderRadius: '10px',
                            color: theme?.customization?.isDarkMode ? 'white' : 'inherit',
                            background: 'rgba(255, 255, 255, 0.1)',
                            backdropFilter: 'blur(5px)',
                            transition: 'all 0.3s ease',
                            '&:hover': {
                                background: 'rgba(255, 255, 255, 0.2)',
                                transform: 'translateY(-2px)',
                                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)'
                            },
                            '&.Mui-selected': {
                                background: 'linear-gradient(135deg, rgba(74, 144, 226, 0.3) 0%, rgba(80, 200, 120, 0.3) 100%)',
                                color: 'white'
                            }
                        }}
                        variant='contained'
                        value='en'
                        title={t('common.english')}
                    >
                        EN
                    </ToggleButton>
                    <ToggleButton
                        sx={{
                            borderColor: 'rgba(255, 255, 255, 0.2)',
                            borderRadius: '10px',
                            color: theme?.customization?.isDarkMode ? 'white' : 'inherit',
                            background: 'rgba(255, 255, 255, 0.1)',
                            backdropFilter: 'blur(5px)',
                            transition: 'all 0.3s ease',
                            '&:hover': {
                                background: 'rgba(255, 255, 255, 0.2)',
                                transform: 'translateY(-2px)',
                                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)'
                            },
                            '&.Mui-selected': {
                                background: 'linear-gradient(135deg, rgba(74, 144, 226, 0.3) 0%, rgba(80, 200, 120, 0.3) 100%)',
                                color: 'white'
                            }
                        }}
                        variant='contained'
                        value='es'
                        title={t('common.spanish')}
                    >
                        ES
                    </ToggleButton>
                </ToggleButtonGroup>
                <MaterialUISwitch checked={isDark} onChange={changeDarkMode} />
            </Box>

            {/* Hero */}
            <Box sx={{ pt: 12, pb: 8 }}>
                <Container maxWidth='lg'>
                    <Grid container spacing={6} alignItems='center'>
                        <Grid item xs={12} md={6}>
                            <Typography variant='h2' fontWeight={800} gutterBottom>
                                {t('landing.hero.title')}
                            </Typography>
                            <Typography variant='h6' color='text.secondary' sx={{ mb: 3 }}>
                                {t('landing.hero.subtitle')}
                            </Typography>
                            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                                <Button size='large' variant='contained' endIcon={<ArrowForwardIcon />} onClick={() => navigate('/signin')}>
                                    {t('landing.hero.ctaGetStarted')}
                                </Button>
                                <Button size='large' variant='outlined' onClick={() => navigate('/register')}>
                                    {t('landing.hero.ctaCreateAccount')}
                                </Button>
                            </Stack>
                        </Grid>
                        <Grid item xs={12} md={6}>
                            <Box
                                sx={{
                                    height: 420,
                                    borderRadius: 3,
                                    bgcolor: 'background.paper',
                                    boxShadow: 4,
                                    border: '1px solid',
                                    borderColor: 'divider'
                                }}
                            />
                        </Grid>
                    </Grid>
                </Container>
            </Box>

            {/* Feature grid */}
            <Box sx={{ py: 8, bgcolor: 'background.default' }}>
                <Container maxWidth='lg'>
                    <Grid container spacing={6}>
                        <Grid item xs={12} md={4}>
                            <Feature title={t('landing.features.visualChatflows.title')} description={t('landing.features.visualChatflows.desc')} />
                        </Grid>
                        <Grid item xs={12} md={4}>
                            <Feature title={t('landing.features.agentsTools.title')} description={t('landing.features.agentsTools.desc')} />
                        </Grid>
                        <Grid item xs={12} md={4}>
                            <Feature title={t('landing.features.datasetsEvals.title')} description={t('landing.features.datasetsEvals.desc')} />
                        </Grid>
                        <Grid item xs={12} md={4}>
                            <Feature title={t('landing.features.vectorStores.title')} description={t('landing.features.vectorStores.desc')} />
                        </Grid>
                        <Grid item xs={12} md={4}>
                            <Feature title={t('landing.features.secureAuth.title')} description={t('landing.features.secureAuth.desc')} />
                        </Grid>
                        <Grid item xs={12} md={4}>
                            <Feature title={t('landing.features.deployAnywhere.title')} description={t('landing.features.deployAnywhere.desc')} />
                        </Grid>
                    </Grid>
                </Container>
            </Box>

            {/* CTA */}
            <Box sx={{ py: 10 }}>
                <Container maxWidth='lg'>
                    <Stack spacing={2} alignItems='center'>
                        <Typography variant='h4' fontWeight={800} align='center'>
                            {t('landing.cta.title')}
                        </Typography>
                        <Typography variant='subtitle1' color='text.secondary' align='center' sx={{ maxWidth: 720 }}>
                            {t('landing.cta.subtitle')}
                        </Typography>
                        <Button size='large' variant='contained' endIcon={<ArrowForwardIcon />} onClick={() => navigate('/signin')}>
                            {t('landing.cta.goToSignin')}
                        </Button>
                    </Stack>
                </Container>
            </Box>
        </Box>
    )
}

export default LandingPage