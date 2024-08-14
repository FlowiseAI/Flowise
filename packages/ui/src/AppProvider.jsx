'use client'
import React from 'react'
import PropTypes from 'prop-types'
import { store } from '@/store'
import { useAuth0 } from '@auth0/auth0-react'

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

const AppProvider = ({ children }) => {
    const { user, getAccessTokenSilently } = useAuth0()

    React.useEffect(() => {
        if (user) {
            // TODO: remove replace
            sessionStorage.setItem('baseURL', user.chatflowDomain?.replace('8080', '4000'))
        }
    }, [user])
    React.useEffect(() => {
        ;(async () => {
            try {
                const newToken = await getAccessTokenSilently({
                    authorizationParams: {
                        // scope: 'write:admin'
                    }
                })
                sessionStorage.setItem('access_token', newToken)
            } catch (err) {
                console.log(err)
            }
        })()
    }, [getAccessTokenSilently])

    return (
        // <React.StrictMode>
        <StyledEngineProvider injectFirst>
            <ThemeProvider theme={themes(store.getState().customization)}>
                <CssBaseline />

                <Provider store={store}>
                    <SnackbarProvider>
                        <ConfirmContextProvider>
                            <ReactFlowContext>{children}</ReactFlowContext>
                        </ConfirmContextProvider>
                    </SnackbarProvider>
                </Provider>
            </ThemeProvider>
        </StyledEngineProvider>
        // </React.StrictMode>
    )
}
AppProvider.propTypes = {
    user: PropTypes.object,
    children: PropTypes.node
}
export default AppProvider
