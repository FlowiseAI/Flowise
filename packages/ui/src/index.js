import React from 'react'
import App from './App'
import { store } from 'store'
import { createRoot } from 'react-dom/client'

// style + assets
import 'assets/scss/style.scss'

// third party
import { BrowserRouter } from 'react-router-dom'
import { Provider } from 'react-redux'
import { SnackbarProvider } from 'notistack'
import ConfirmContextProvider from 'store/context/ConfirmContextProvider'
import { ReactFlowContext } from 'store/context/ReactFlowContext'
import { Auth0Provider } from '@auth0/auth0-react'

const container = document.getElementById('root')
const root = createRoot(container)

root.render(
    <React.StrictMode>
        <Auth0Provider
            domain="maslowai.us.auth0.com"
			clientId="mAtuCUYbMrPX7EdGKSCsLJYXGbuo4VBH"
            authorizationParams={{
                redirect_uri: window.location.origin
            }}
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
