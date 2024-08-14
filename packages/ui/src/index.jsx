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
import flagsmith from 'flagsmith'
import { FlagsmithProvider } from 'flagsmith/react'

const container = document.getElementById('root')
const root = createRoot(container)

root.render(
    <React.StrictMode>
        <FlagsmithProvider
            options={{
                environmentID: '6wTLhz8VakAkpZMPdoScmg'
            }}
            flagsmith={flagsmith}
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
        </FlagsmithProvider>
    </React.StrictMode>
)
