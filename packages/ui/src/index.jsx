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

const container = document.getElementById('root')
const root = createRoot(container)

const authorizationParams = {
    organization: import.meta.env.VITE_AUTH_ORGANIZATION_ID !== '' ? import.meta.env.VITE_AUTH_ORGANIZATION_ID : undefined,
    redirect_uri: window.location.origin,
    audience: import.meta.env.VITE_AUTH_AUDIENCE,
    scope: 'openid profile email write:admin'
}

root.render(
    <React.StrictMode>
        <Auth0Provider
            domain={import.meta.env.VITE_AUTH_DOMAIN}
            clientId={import.meta.env.VITE_AUTH_CLIENT_ID}
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
    </React.StrictMode>
)
