import { useSelector } from 'react-redux'
import { ThemeProvider } from '@mui/material/styles'
import { CssBaseline, StyledEngineProvider } from '@mui/material'
import { ConfigProvider } from 'antd'
import zhCN from 'antd/locale/zh_CN'

// routing
import Routes from '@/routes'

// defaultTheme
import themes from '@/themes'

// project imports
import NavigationScroll from '@/layout/NavigationScroll'

// ==============================|| APP ||============================== //

const App = () => {
    const customization = useSelector((state) => state.customization)

    return (
        <StyledEngineProvider injectFirst>
            <ThemeProvider theme={themes(customization)}>
                <CssBaseline />
                <ConfigProvider locale={zhCN} theme={themes(customization)}>
                    <NavigationScroll>
                        <Routes />
                    </NavigationScroll>
                </ConfigProvider>
            </ThemeProvider>
        </StyledEngineProvider>
    )
}

export default App
