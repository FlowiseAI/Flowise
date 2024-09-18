'use client'
import React from 'react'
import PropTypes from 'prop-types'
import { store } from '@/store'
import { useAuth0 } from '@auth0/auth0-react'

// style + assets
import '@/assets/scss/style.scss'

// third party
import { Provider } from 'react-redux'
import { SnackbarProvider } from 'notistack'
import ConfirmContextProvider from '@/store/context/ConfirmContextProvider'
import { ReactFlowContext } from '@/store/context/ReactFlowContext'

import { CssBaseline, StyledEngineProvider } from '@mui/material'
import { ThemeProvider } from '@mui/material/styles'
import themes from '@/themes'
import { setBaseURL } from './store/constant'

const AppProvider = ({ children }) => {
    const { user, getAccessTokenSilently, isLoading, loginWithRedirect, isAuthenticated } = useAuth0()

    // TODO: Improve setting the baseURL with server state
    React.useEffect(() => {
        if (user) {
            setBaseURL(user.chatflowDomain)
        }
    }, [isLoading, user, isAuthenticated])
    React.useEffect(() => {
        ;(async () => {
            try {
                const newToken = await getAccessTokenSilently()
                sessionStorage.setItem('access_token', newToken)
            } catch (err) {
                // loginWithRedirect()
                console.log(err)
            }
        })()
    }, [getAccessTokenSilently, loginWithRedirect])

    return (
        // <React.StrictMode>
        <StyledEngineProvider injectFirst>
            <ThemeProvider theme={themes(store.getState().customization)}>
                <CssBaseline />

                <Provider store={store}>
                    <SnackbarProvider>
                        <ConfirmContextProvider>
                            {/* Improve loading state when there is no user (currently all or nothing due to icons ) */}
                            <ReactFlowContext>{children}</ReactFlowContext>
                        </ConfirmContextProvider>
                    </SnackbarProvider>
                </Provider>
            </ThemeProvider>
        </StyledEngineProvider>
        // </React.StrictMode>
    )
}
AppProvider.propTypes = {
    user: PropTypes.object,
    children: PropTypes.node
}
export default AppProvider
