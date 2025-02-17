import PropTypes from 'prop-types'
import { useDispatch, useSelector } from 'react-redux'
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
// material-ui
import { useTheme } from '@mui/material/styles'
import { Avatar, Box, ButtonBase } from '@mui/material'

// project imports
import LogoSection from '../LogoSection'
import ProfileSection from './ProfileSection'

// assets
import { IconMenu2 } from '@tabler/icons-react'

// store
import { enqueueSnackbar as enqueueSnackbarAction, closeSnackbar as closeSnackbarAction, SET_DARKMODE, logoutAction } from '@/store/actions'
import LoginDialog from '@/ui-component/dialog/LoginDialog'
import ConfirmDialog from '@/ui-component/dialog/ConfirmDialog'

// api
import userApi from '@/api/user'
import { Button } from '@mui/base'
import { IconX } from '@tabler/icons-react'
import useNotifier from '@/utils/useNotifier'

// ==============================|| MAIN NAVBAR / HEADER ||============================== //

const Header = ({ handleLeftDrawerToggle }) => {
  const dispatch = useDispatch()
  useNotifier()

  const enqueueSnackbar = (...args) => dispatch(enqueueSnackbarAction(...args))
  const closeSnackbar = (...args) => dispatch(closeSnackbarAction(...args))
  const logout = (...args) => dispatch(logoutAction(...args))
  const [isLoading, setIsLoading] = useState(false)

  const user = useSelector((state) => state.user)
  const isLogin = user?.id ? true : false

  const [loginDialogOpen, setLoginDialogOpen] = useState(false)
  const [loginDialogProps] = useState({
    title: 'Login',
    confirmButtonName: 'Login'
  })

  const theme = useTheme()
  const navigate = useNavigate()

  const customization = useSelector((state) => state.customization)
  const [isDark, setIsDark] = useState(customization.isDarkMode)

  const changeDarkMode = () => {
    dispatch({ type: SET_DARKMODE, isDarkMode: !isDark })
    setIsDark((isDark) => !isDark)
    localStorage.setItem('isDarkMode', !isDark)
  }

  const handleLogout = () => {
    localStorage.removeItem('dataLogin')
    logout({})
    window.location.href = '/c-agent/'
  }

  const onLoginClick = async (username, password) => {
    setIsLoading(true)
    try {
      let resData = await userApi.loginUser({ username, password })
      resData = resData.data
      if (resData) {
        localStorage.setItem('dataLogin', JSON.stringify(resData))
        // login(resData?.user)
        setLoginDialogOpen(false)
        enqueueSnackbar({
          message: 'Đăng nhập thành công.',
          options: {
            variant: 'success',
            action: (key) => (
              <Button style={{ color: 'white' }} onClick={() => closeSnackbar(key)}>
                <IconX />
              </Button>
            )
          }
        })
        navigate(0)
      }
    } catch (error) {
      localStorage.removeItem('dataLogin')
      logout({})
      if (error.response.data.message) {
        return enqueueSnackbar({
          message: error.response.data.message,
          options: {
            variant: 'error',
            action: (key) => (
              <Button style={{ color: 'white' }} onClick={() => closeSnackbar(key)}>
                <IconX />
              </Button>
            )
          }
        })
      }
      return enqueueSnackbar({
        message: 'Đăng nhập thất bại.',
        options: {
          variant: 'error',
          action: (key) => (
            <Button style={{ color: 'white' }} onClick={() => closeSnackbar(key)}>
              <IconX />
            </Button>
          )
        }
      })
    } finally {
      setIsLoading(false)
    }
  }

  // TODO: disable dark mode
  useEffect(() => {
    if (isDark) {
      changeDarkMode()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDark])

  return (
    <>
      {/* logo & toggler button */}
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
      </Box>
      <Box sx={{ flexGrow: 1 }} />
      {/*<MaterialUISwitch checked={isDark} onChange={changeDarkMode} />*/}
      <Box sx={{ ml: 2 }}></Box>
      {isLogin ? (
        <ProfileSection handleLogout={handleLogout} username={user.username ?? ''} />
      ) : (
        <>
          {' '}
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <ButtonBase
              sx={{
                borderRadius: '12px',
                overflow: 'hidden',
                background: theme.palette.primary.main,
                color: theme.palette.primary.contrastText,
                padding: '8px 16px',
                '&:hover': {
                  background: theme.palette.primary.dark
                }
              }}
              onClick={() => setLoginDialogOpen(true)}
            >
              Login
            </ButtonBase>
          </Box>
          <LoginDialog
            show={loginDialogOpen}
            dialogProps={loginDialogProps}
            onConfirm={onLoginClick}
            onClose={() => setLoginDialogOpen(false)}
            disableBtn={isLoading || undefined}
          />
          <ConfirmDialog />
        </>
      )}
    </>
  )
}

Header.propTypes = {
  handleLeftDrawerToggle: PropTypes.func
}

export default Header
