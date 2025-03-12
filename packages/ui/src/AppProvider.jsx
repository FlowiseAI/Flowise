'use client'
import React from 'react'
import PropTypes from 'prop-types'
import { store } from '@/store'
import { UserProvider } from '@auth0/nextjs-auth0/client'

// style + assets
import '@/assets/scss/style.scss'

// third party
import { Provider } from 'react-redux'
import { SnackbarProvider } from 'notistack'
import ConfirmContextProvider from '@/store/context/ConfirmContextProvider'
import { ReactFlowContext } from '@/store/context/ReactFlowContext'

// import { CssBaseline, StyledEngineProvider } from '@mui/material'
// import { ThemeProvider } from '@mui/material/styles'
// import themes from '@/themes'

// Create a new context
export const Auth0Context = React.createContext({ isAuth0Ready: false })

// New component to wrap Auth0 setup
import { Auth0Setup } from './hooks/useAuth0Setup'

const AppProvider = ({ children, apiHost, accessToken }) => {
    return (
        <Provider store={store}>
            <SnackbarProvider>
                <ConfirmContextProvider>
                    <UserProvider>
                        <Auth0Setup apiHost={apiHost} accessToken={accessToken}>
                            <ReactFlowContext>{children}</ReactFlowContext>
                        </Auth0Setup>
                    </UserProvider>
                </ConfirmContextProvider>
            </SnackbarProvider>
        </Provider>
    )
}

AppProvider.propTypes = {
    children: PropTypes.node,
    apiHost: PropTypes.string,
    accessToken: PropTypes.string
}

export default AppProvider
