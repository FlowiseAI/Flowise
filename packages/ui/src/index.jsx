import App from '@/App'
import { store } from '@/store'
import React from 'react'
import { createRoot } from 'react-dom/client'

// style + assets
import '@/assets/scss/style.scss'

// third party
import { ConfigProvider } from '@/store/context/ConfigContext'
import ConfirmContextProvider from '@/store/context/ConfirmContextProvider'
import { ErrorProvider } from '@/store/context/ErrorContext'
import { ReactFlowContext } from '@/store/context/ReactFlowContext'
import { SnackbarProvider } from 'notistack'
import { Provider } from 'react-redux'
import { BrowserRouter } from 'react-router-dom'

const container = document.getElementById('root')
const root = createRoot(container)

// Read base path for routing from env (e.g., "/flowise"). Empty string or undefined means root
const routerBaseName = import.meta.env.VITE_BASE_PATH || ''

root.render(
    <React.StrictMode>
        <Provider store={store}>
            <BrowserRouter basename={routerBaseName}>
                <SnackbarProvider>
                    <ConfigProvider>
                        <ErrorProvider>
                            <ConfirmContextProvider>
                                <ReactFlowContext>
                                    <App />
                                </ReactFlowContext>
                            </ConfirmContextProvider>
                        </ErrorProvider>
                    </ConfigProvider>
                </SnackbarProvider>
            </BrowserRouter>
        </Provider>
    </React.StrictMode>
)
