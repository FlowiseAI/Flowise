'use client'
import React from 'react'
import App from '@/App'
import { store } from '@/store'
import { Auth0Provider } from '@auth0/auth0-react'

// style + assets
import '@/assets/scss/style.scss'

// third party
import { BrowserRouter } from 'react-router-dom'
import { Provider } from 'react-redux'
import { SnackbarProvider } from 'notistack'
import ConfirmContextProvider from '@/store/context/ConfirmContextProvider'
import { ReactFlowContext } from '@/store/context/ReactFlowContext'
import flagsmith from 'flagsmith/isomorphic'
import { FlagsmithProvider } from 'flagsmith/react'

const AppRoot = ({ organizationId }) => {
    const authorizationParams = {
        organization: organizationId,
        redirect_uri: typeof window !== 'undefined' ? window?.location?.origin : '',
        audience: process.env.VITE_AUTH_AUDIENCE,
        scope: 'openid profile email'
    }
    return (
        <React.StrictMode>
            <FlagsmithProvider
                options={{
                    environmentID: '6wTLhz8VakAkpZMPdoScmg'
                }}
                flagsmith={flagsmith}
            >
                <Auth0Provider
                    domain={process.env.VITE_AUTH_DOMAIN}
                    clientId={process.env.VITE_AUTH_CLIENT_ID}
                    authorizationParams={authorizationParams}
                >
                    <Provider store={store}>
                        <BrowserRouter basename={'/sidekick-studio'}>
                            <SnackbarProvider>
                                <ConfirmContextProvider>
                                    <ReactFlowContext>
                                        <App />
                                    </ReactFlowContext>
                                </ConfirmContextProvider>
                            </SnackbarProvider>
                        </BrowserRouter>
                    </Provider>
                </Auth0Provider>
            </FlagsmithProvider>
        </React.StrictMode>
    )
}

export default AppRoot
