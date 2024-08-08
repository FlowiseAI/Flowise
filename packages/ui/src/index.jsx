import React from 'react'
import App from '@/App'
import { store } from '@/store'
import { createRoot } from 'react-dom/client'
import { Auth0Provider } from '@auth0/auth0-react'

// style + assets
import '@/assets/scss/style.scss'

// third party
import { BrowserRouter } from 'react-router-dom'
import { Provider } from 'react-redux'
import { SnackbarProvider } from 'notistack'
import ConfirmContextProvider from '@/store/context/ConfirmContextProvider'
import { ReactFlowContext } from '@/store/context/ReactFlowContext'
import flagsmith from 'flagsmith'
import { FlagsmithProvider } from 'flagsmith/react'

const container = document.getElementById('root')
const root = createRoot(container)

const authorizationParams = {
    organization: process.env.VITE_AUTH_ORGANIZATION_ID !== '' ? process.env.VITE_AUTH_ORGANIZATION_ID : undefined,
    redirect_uri: window.location.origin,
    audience: process.env.VITE_AUTH_AUDIENCE,
    scope: 'openid profile email'
}

root.render(
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
                    <BrowserRouter>
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
