import { useSelector } from 'react-redux'

import { ThemeProvider } from '@mui/material/styles'
import { CssBaseline, StyledEngineProvider } from '@mui/material'

// routing
import Routes from '@/routes'

// defaultTheme
import themes from '@/themes'

// project imports
import NavigationScroll from '@/layout/NavigationScroll'
import OnboardingGate from '@/views/onboarding/OnboardingGate'
import { OverlayProvider } from '@/ui-component/overlay/OverlayProvider'

// ==============================|| APP ||============================== //

const App = () => {
    const customization = useSelector((state) => state.customization)

    return (
        <StyledEngineProvider injectFirst>
            <ThemeProvider theme={themes(customization)}>
                <CssBaseline />
                <OverlayProvider>
                    <OnboardingGate>
                        <NavigationScroll>
                            <Routes />
                        </NavigationScroll>
                    </OnboardingGate>
                </OverlayProvider>
            </ThemeProvider>
        </StyledEngineProvider>
    )
}

export default App
