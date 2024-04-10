import React from 'react'
import { useSelector } from 'react-redux'

import { ThemeProvider } from '@mui/material/styles'
import { Button, CssBaseline, StyledEngineProvider } from '@mui/material'

// routing
import Routes from '@/routes'

// defaultTheme
import themes from '@/themes'

// project imports
import NavigationScroll from '@/layout/NavigationScroll'
import { useAuth0 } from '@auth0/auth0-react'
import useNotifyParentOfNavigation from './utils/useNotifyParentOfNavigation'

// ==============================|| APP ||============================== //

const App = () => {
    const customization = useSelector((state) => state.customization)
    const { user, error, isAuthenticated, isLoading, loginWithRedirect, getAccessTokenSilently } = useAuth0()
    useNotifyParentOfNavigation()
    React.useEffect(() => {
        ;(async () => {
            try {
                const newToken = await getAccessTokenSilently({
                    authorizationParams: {
                        // organization:
                        //     import.meta.env.VITE_AUTH_ORGANIZATION_ID !== '' ? import.meta.env.VITE_AUTH_ORGANIZATION_ID : undefined,
                        // redirect_uri: window.location.origin,
                        // audience: import.meta.env.VITE_AUTH_AUDIENCE,
                        scope: 'write:admin'
                    }
                })
                console.log(newToken)
                localStorage.setItem('access_token', newToken)
            } catch (err) {
                console.log(err)
            }
        })()
    }, [getAccessTokenSilently])
    React.useEffect(() => {
        if (!isLoading && !isAuthenticated && !error) {
            loginWithRedirect()
        }
    }, [user, error, isLoading, isAuthenticated, loginWithRedirect])

    return (
        <StyledEngineProvider injectFirst>
            <ThemeProvider theme={themes(customization)}>
                <CssBaseline />
                <NavigationScroll>{isAuthenticated && <Routes />}</NavigationScroll>
                {error && (
                    <>
                        <h1>{error.message}</h1>
                        <Button onClick={() => loginWithRedirect()}>Try Again</Button>
                    </>
                )}
            </ThemeProvider>
        </StyledEngineProvider>
    )
}

export default App
