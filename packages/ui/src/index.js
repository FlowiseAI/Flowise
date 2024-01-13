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
import { ClerkProvider } from '@clerk/clerk-react'

const container = document.getElementById('root')
const root = createRoot(container)
// Import your publishable key
const PUBLISHABLE_KEY = 'pk_test_bm9ibGUtbW91c2UtNzUuY2xlcmsuYWNjb3VudHMuZGV2JA'
if (!PUBLISHABLE_KEY) {
    throw new Error('Missing Publishable Key')
}

root.render(
    <React.StrictMode>
        <ClerkProvider publishableKey={PUBLISHABLE_KEY}>
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
        </ClerkProvider>
    </React.StrictMode>
)
