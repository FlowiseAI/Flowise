import { useSelector } from 'react-redux'

import { ThemeProvider } from '@mui/material/styles'
import { CssBaseline, StyledEngineProvider } from '@mui/material'

// routing
import Routes from 'routes'

// defaultTheme
import themes from 'themes'

// project imports
import NavigationScroll from 'layout/NavigationScroll'
import { SessionProvider } from 'next-auth/react'

const App = (Component, pageProps) => {
    const customization = useSelector((state) => state.customization)
    const session = pageProps.session

    return (
        <StyledEngineProvider injectFirst>
            <ThemeProvider theme={themes(customization)}>
                <CssBaseline />
                <NavigationScroll>
                    <SessionProvider session={session}>
                        <Routes />
                    </SessionProvider>
                </NavigationScroll>
            </ThemeProvider>
        </StyledEngineProvider>
    )
}

export default App
