import { useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { enqueueSnackbar as enqueueSnackbarAction, closeSnackbar as closeSnackbarAction } from '@/store/actions'
import { store } from '@/store'

// material-ui
import { Divider, Box, Button, List, ListItemButton, ListItemIcon, Typography } from '@mui/material'
import { useTheme } from '@mui/material/styles'

// project imports
import useNotifier from '@/utils/useNotifier'
import { useConfig } from '@/store/context/ConfigContext'

// API
import { logoutSuccess } from '@/store/reducers/authSlice'

// Hooks
import useApi from '@/hooks/useApi'

// icons
import { IconFileText, IconLogout, IconX } from '@tabler/icons-react'
import accountApi from '@/api/account.api'

const CloudMenuList = () => {
    const customization = useSelector((state) => state.customization)
    const dispatch = useDispatch()
    useNotifier()
    const theme = useTheme()

    const enqueueSnackbar = (...args) => dispatch(enqueueSnackbarAction(...args))
    const closeSnackbar = (...args) => dispatch(closeSnackbarAction(...args))

    const logoutApi = useApi(accountApi.logout)
    const { isCloud } = useConfig()

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

    return (
        <>
            {isCloud && (
                <Box>
                    <Divider sx={{ height: '1px', borderColor: theme.palette.grey[900] + 25, my: 0 }} />
                    <List sx={{ p: '16px', py: 2, display: 'flex', flexDirection: 'column', gap: 1 }}>
                        <a href='https://docs.flowiseai.com' target='_blank' rel='noreferrer' style={{ textDecoration: 'none' }}>
                            <ListItemButton
                                sx={{
                                    borderRadius: `${customization.borderRadius}px`,
                                    alignItems: 'flex-start',
                                    backgroundColor: 'inherit',
                                    py: 1.25,
                                    pl: '24px'
                                }}
                            >
                                <ListItemIcon sx={{ my: 'auto', minWidth: 36 }}>
                                    <IconFileText size='1.3rem' strokeWidth='1.5' />
                                </ListItemIcon>
                                <Typography variant='body1' color='inherit' sx={{ my: 0.5 }}>
                                    Documentation
                                </Typography>
                            </ListItemButton>
                        </a>
                        <ListItemButton
                            onClick={signOutClicked}
                            sx={{
                                borderRadius: `${customization.borderRadius}px`,
                                alignItems: 'flex-start',
                                backgroundColor: 'inherit',
                                py: 1.25,
                                pl: '24px'
                            }}
                        >
                            <ListItemIcon sx={{ my: 'auto', minWidth: 36 }}>
                                <IconLogout size='1.3rem' strokeWidth='1.5' />
                            </ListItemIcon>
                            <Typography variant='body1' color='inherit' sx={{ my: 0.5 }}>
                                Logout
                            </Typography>
                        </ListItemButton>
                    </List>
                </Box>
            )}
        </>
    )
}

export default CloudMenuList
