import React from 'react'
import App from '@/App'
import { store } from '@/store'
import { createRoot } from 'react-dom/client'

// style + assets
import '@/assets/scss/style.scss'

// third party
import { BrowserRouter } from 'react-router-dom'
import { Provider } from 'react-redux'
import { SnackbarProvider } from 'notistack'
import ConfirmContextProvider from '@/store/context/ConfirmContextProvider'
import { ReactFlowContext } from '@/store/context/ReactFlowContext'
import { ConfigProvider } from '@/store/context/ConfigContext'
import { ErrorProvider } from '@/store/context/ErrorContext'

// i18n
import i18n from '@/i18n'
import { I18nextProvider } from 'react-i18next'

const container = document.getElementById('root')
const root = createRoot(container)

root.render(
    <React.StrictMode>
        <Provider store={store}>
            <BrowserRouter>
                <SnackbarProvider>
                    <ConfigProvider>
                        <ErrorProvider>
                            <ConfirmContextProvider>
                                <ReactFlowContext>
                                    <I18nextProvider i18n={i18n}>
                                        <App />
                                    </I18nextProvider>
                                </ReactFlowContext>
                            </ConfirmContextProvider>
                        </ErrorProvider>
                    </ConfigProvider>
                </SnackbarProvider>
            </BrowserRouter>
        </Provider>
    </React.StrictMode>
)
