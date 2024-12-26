import PropTypes from 'prop-types'
import { useDispatch, useSelector } from 'react-redux'
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
// material-ui
import { styled, useTheme } from '@mui/material/styles'
import { Avatar, Box, ButtonBase, Switch } from '@mui/material'

// project imports
import LogoSection from '../LogoSection'
import ProfileSection from './ProfileSection'

// assets
import { IconMenu2 } from '@tabler/icons-react'

// store
import { enqueueSnackbar as enqueueSnackbarAction, closeSnackbar as closeSnackbarAction, SET_DARKMODE } from '@/store/actions'
import LoginDialog from '@/ui-component/dialog/LoginDialog'
import ConfirmDialog from '@/ui-component/dialog/ConfirmDialog'
import useApi from '@/hooks/useApi'

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

  const [loginDialogOpen, setLoginDialogOpen] = useState(false)
  const [loginDialogProps] = useState({
    title: 'Login',
    confirmButtonName: 'Login'
  })

  const loginApi = useApi(userApi.loginUser)

  const theme = useTheme()
  const navigate = useNavigate()

  const dataLogin = localStorage.getItem('dataLogin') ? JSON?.parse(localStorage.getItem('dataLogin')) : {}
  const isLogin = dataLogin?.user?.id ? true : false

  const customization = useSelector((state) => state.customization)
  const [isDark, setIsDark] = useState(customization.isDarkMode)

  const changeDarkMode = () => {
    dispatch({ type: SET_DARKMODE, isDarkMode: !isDark })
    setIsDark((isDark) => !isDark)
    localStorage.setItem('isDarkMode', !isDark)
  }

  const handleLogout = () => {
    localStorage.removeItem('dataLogin')
    navigate(0)
  }

  const onLoginClick = async (username, password) => {
    const resData = await loginApi.request({ username, password })
    if (loginApi.error) {
      localStorage.removeItem('dataLogin')
      if (loginApi.error.response.data.message) {
        return enqueueSnackbar({
          message: loginApi.error.response.data.message,
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
    }

    if (resData) {
      localStorage.setItem('dataLogin', JSON.stringify(resData))
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
  }

  // TODO: disable dark mode
  useEffect(() => {
    if (isDark) {
      changeDarkMode()
    }
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
        <ProfileSection handleLogout={handleLogout} username={dataLogin.user.username ?? ''} />
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
