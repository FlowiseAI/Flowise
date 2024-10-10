'use client'
import React, { useState, useEffect } from 'react'
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

// Create a new context
export const Auth0Context = React.createContext({ isAuth0Ready: false })

const AppProvider = ({ children }) => {
    const { user, getAccessTokenSilently, isLoading, loginWithRedirect, isAuthenticated } = useAuth0()
    const [isAuth0Ready, setIsAuth0Ready] = useState(false)

    // TODO: Improve setting the baseURL with server state
    useEffect(() => {
        if (user) {
            setBaseURL(user.chatflowDomain)
        }
    }, [isLoading, user, isAuthenticated])
    useEffect(() => {
        ;(async () => {
            try {
                const newToken = await getAccessTokenSilently()
                sessionStorage.setItem('access_token', newToken)
                setIsAuth0Ready(true)
            } catch (err) {
                console.log('err', err)
                if (err.message == 'Login required') {
                    loginWithRedirect()
                }
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
                            <Auth0Context.Provider value={{ isAuth0Ready }}>
                                {/* Improve loading state when there is no user (currently all or nothing due to icons ) */}
                                <ReactFlowContext>{children}</ReactFlowContext>
                            </Auth0Context.Provider>
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
