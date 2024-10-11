'use client'
import React from 'react'
import PropTypes from 'prop-types'
import { store } from '@/store'
import { Auth0Provider } from '@auth0/auth0-react'

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

// Create a new context
export const Auth0Context = React.createContext({ isAuth0Ready: false })

// New component to wrap Auth0 setup
import { useAuth0Setup } from './hooks/useAuth0Setup'

const Auth0Setup = ({ children, apiHost }) => {
    const { isAuth0Ready, user } = useAuth0Setup(apiHost)

    return <Auth0Context.Provider value={{ isAuth0Ready, user }}>{children}</Auth0Context.Provider>
}

const AppProvider = ({ children, apiHost }) => {
    return (
        <StyledEngineProvider injectFirst>
            <ThemeProvider theme={themes(store.getState().customization)}>
                <CssBaseline />
                <Provider store={store}>
                    <SnackbarProvider>
                        <ConfirmContextProvider>
                            <Auth0Provider
                                domain={process.env.REACT_APP_AUTH0_DOMAIN}
                                clientId={process.env.REACT_APP_AUTH0_CLIENT_ID}
                                // authorizationParams={{
                                //     redirect_uri: typeof window !== 'undefined' ? window.location.origin : ''
                                // }}
                            >
                                <Auth0Setup apiHost={apiHost}>
                                    <ReactFlowContext>{children}</ReactFlowContext>
                                </Auth0Setup>
                            </Auth0Provider>
                        </ConfirmContextProvider>
                    </SnackbarProvider>
                </Provider>
            </ThemeProvider>
        </StyledEngineProvider>
    )
}

AppProvider.propTypes = {
    children: PropTypes.node,
    apiHost: PropTypes.string
}

export default AppProvider
