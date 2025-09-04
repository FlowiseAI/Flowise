import PropTypes from 'prop-types'
import { useSelector, useDispatch } from 'react-redux'
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

// material-ui
import { Button, Avatar, Box, ButtonBase, Switch, Typography, Link, ToggleButton, ToggleButtonGroup } from '@mui/material'
import { useTheme, styled, darken } from '@mui/material/styles'

// project imports
import LogoSection from '../LogoSection'
import ProfileSection from './ProfileSection'
import WorkspaceSwitcher from '@/layout/MainLayout/Header/WorkspaceSwitcher'
import OrgWorkspaceBreadcrumbs from '@/layout/MainLayout/Header/OrgWorkspaceBreadcrumbs'
import PricingDialog from '@/ui-component/subscription/PricingDialog'

// assets
import { IconMenu2, IconX, IconSparkles, IconBrandGithub } from '@tabler/icons-react'

// store
import { store } from '@/store'
import { SET_DARKMODE } from '@/store/actions'
import { useConfig } from '@/store/context/ConfigContext'
import { enqueueSnackbar as enqueueSnackbarAction, closeSnackbar as closeSnackbarAction } from '@/store/actions'
import { logoutSuccess } from '@/store/reducers/authSlice'

// API
import accountApi from '@/api/account.api'

// Hooks
import useApi from '@/hooks/useApi'
import useNotifier from '@/utils/useNotifier'

// ==============================|| MAIN NAVBAR / HEADER ||============================== //

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



const Header = ({ handleLeftDrawerToggle }) => {
    const theme = useTheme()
    const navigate = useNavigate()
    const { t, i18n } = useTranslation()

    const customization = useSelector((state) => state.customization)
    const logoutApi = useApi(accountApi.logout)

    const [isDark, setIsDark] = useState(customization.isDarkMode)
    const dispatch = useDispatch()
    const { isEnterpriseLicensed, isCloud, isOpenSource } = useConfig()
    const currentUser = useSelector((state) => state.auth.user)
    const isAuthenticated = useSelector((state) => state.auth.isAuthenticated)
    const [isPricingOpen, setIsPricingOpen] = useState(false)

    // GitHub stars
    const [stars, setStars] = useState(null)

    useNotifier()

    const enqueueSnackbar = (...args) => dispatch(enqueueSnackbarAction(...args))
    const closeSnackbar = (...args) => dispatch(closeSnackbarAction(...args))

    const changeDarkMode = () => {
        dispatch({ type: SET_DARKMODE, isDarkMode: !isDark })
        setIsDark((isDark) => !isDark)
        localStorage.setItem('isDarkMode', !isDark)
    }

    const handleLangToggle = (event, nextLang) => {
        if (!nextLang) return
        i18n.changeLanguage(nextLang)
        if (typeof window !== 'undefined') localStorage.setItem('app_lang', nextLang)
    }

    const signOutClicked = () => {
        logoutApi.request()
        enqueueSnackbar({
            message: 'Logging out...',
            options: {
                key: new Date().getTime() + Math.random(),
                variant: 'success',
                action: (key) => (
                    <Button style={{ color: 'white' }} onClick={() => closeSnackbar(key)}>
                        <IconX />
                    </Button>
                )
            }
        })
    }

    useEffect(() => {
        try {
            if (logoutApi.data && logoutApi.data.message === 'logged_out') {
                store.dispatch(logoutSuccess())
                window.location.href = logoutApi.data.redirectTo
            }
        } catch (e) {
            console.error(e)
        }
    }, [logoutApi.data])

    // Fetch GitHub stars for OSS build only
    useEffect(() => {
        let cancelled = false
        async function fetchStars() {
            try {
                // if (!isOpenSource) return
                // const resp = await fetch('https://api.github.com/repos/FlowiseAI/Flowise')
                // if (!resp.ok) return
                // const json = await resp.json()
                // if (!cancelled) setStars(json?.stargazers_count ?? null)
            } catch (err) {
                console.error('Failed to fetch GitHub stars', err)
            }
        }
        fetchStars()
        // refresh occasionally (once per hour)
        const id = setInterval(fetchStars, 60 * 60 * 1000)
        return () => {
            cancelled = true
            clearInterval(id)
        }
    }, [isOpenSource])


    return (
        <>
            <Box
                sx={{
                    width: 228,
                    display: 'flex',
                    [theme.breakpoints.down('md')]: {
                        width: 'auto'
                    }
                }}
            >
                <Box component='span' sx={{ display: { xs: 'none', md: 'block' }, flexGrow: 1 }}>
                    <LogoSection />
                </Box>
                {isAuthenticated && (
                    <ButtonBase sx={{ borderRadius: '12px', overflow: 'hidden' }}>
                        <Avatar
                            variant='rounded'
                            sx={{
                                ...theme.typography.commonAvatar,
                                ...theme.typography.mediumAvatar,
                                transition: 'all .2s ease-in-out',
                                background: theme.palette.secondary.light,
                                color: theme.palette.secondary.dark,
                                '&:hover': {
                                    background: theme.palette.secondary.dark,
                                    color: theme.palette.secondary.light
                                }
                            }}
                            onClick={handleLeftDrawerToggle}
                            color='inherit'
                        >
                            <IconMenu2 stroke={1.5} size='1.3rem' />
                        </Avatar>
                    </ButtonBase>
                )}
            </Box>
            {/* GitHub Star (OSS only) */}
            {false && isOpenSource && (
                <Box sx={{ ml: 1.5, display: { xs: 'none', sm: 'flex' }, alignItems: 'center', gap: 1 }}>
                    <Link
                        href='https://github.com/FlowiseAI/Flowise'
                        target='_blank'
                        rel='noreferrer'
                        underline='none'
                        sx={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 0.5,
                            px: 1.25,
                            py: 0.5,
                            borderRadius: 999,
                            border: (theme) => `1px solid ${theme.palette.divider}`,
                            color: 'text.primary',
                            backgroundColor: (theme) => theme.palette.background.paper,
                            '&:hover': { backgroundColor: (theme) => theme.palette.action.hover }
                        }}
                        title='Star FlowiseAI/Flowise on GitHub'
                    >
                        <IconBrandGithub size={16} />
                        <Typography variant='body2' sx={{ fontWeight: 600 }}>
                            Star
                        </Typography>
                    </Link>
                    <Link
                        href='https://github.com/FlowiseAI/Flowise/stargazers'
                        target='_blank'
                        rel='noreferrer'
                        underline='none'
                        sx={{
                            px: 1,
                            py: 0.5,
                            borderRadius: 999,
                            border: (theme) => `1px solid ${theme.palette.divider}`,
                            color: 'text.secondary',
                            backgroundColor: (theme) => theme.palette.background.paper,
                            minWidth: 56,
                            textAlign: 'center'
                        }}
                        title='View stargazers'
                    >
                        <Typography variant='body2' sx={{ fontWeight: 600 }}>
                            {stars != null ? Number(stars).toLocaleString() : '—'}
                        </Typography>
                    </Link>
                </Box>
            )}
            <Box sx={{ flexGrow: 1 }} />
            {isEnterpriseLicensed && isAuthenticated && <WorkspaceSwitcher />}
            {isCloud && isAuthenticated && <OrgWorkspaceBreadcrumbs />}
            {isCloud && currentUser?.isOrganizationAdmin && (
                <Button
                    variant='contained'
                    sx={{
                        mr: 1,
                        ml: 2,
                        borderRadius: 15,
                        background: (theme) =>
                            `linear-gradient(90deg, ${theme.palette.primary.main} 10%, ${theme.palette.secondary.main} 100%)`,
                        color: (theme) => theme.palette.secondary.contrastText,
                        boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
                        transition: 'all 0.3s ease',
                        '&:hover': {
                            background: (theme) =>
                                `linear-gradient(90deg, ${darken(theme.palette.primary.main, 0.1)} 10%, ${darken(
                                    theme.palette.secondary.main,
                                    0.1
                                )} 100%)`,
                            boxShadow: '0 4px 8px rgba(0,0,0,0.3)'
                        }
                    }}
                    onClick={() => setIsPricingOpen(true)}
                    startIcon={<IconSparkles size={20} />}
                >
                    Upgrade
                </Button>
            )}
            {isPricingOpen && isCloud && (
                <PricingDialog
                    open={isPricingOpen}
                    onClose={(planUpdated) => {
                        setIsPricingOpen(false)
                        if (planUpdated) {
                            navigate('/')
                            navigate(0)
                        }
                    }}
                />
            )}
            <ToggleButtonGroup
                sx={{
                    borderRadius: '12px',
                    maxHeight: 40,
                    background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.1) 0%, rgba(255, 255, 255, 0.05) 100%)',
                    backdropFilter: 'blur(10px)',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                    boxShadow: '0 4px 16px rgba(0, 0, 0, 0.1)',
                    mr: 2.5
                }}
                value={(i18n.language && i18n.language.split('-')[0]) || 'en'}
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
            <MaterialUISwitch checked={isDark} onChange={changeDarkMode} sx={{ mr: 3 }} />
            <ProfileSection handleLogout={signOutClicked} />
        </>
    )
}

Header.propTypes = {
    handleLeftDrawerToggle: PropTypes.func
}

export default Header
