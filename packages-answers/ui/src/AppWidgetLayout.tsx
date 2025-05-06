'use client'
import { Session } from '@auth0/nextjs-auth0'
import flagsmith from 'flagsmith/isomorphic'
import { FlagsmithProvider } from 'flagsmith/react'

import CssBaseline from '@mui/material/CssBaseline'
import ThemeProvider from '@mui/material/styles/ThemeProvider'

import { darkModeTheme } from './theme'
import GlobalStyles from './GlobalStyles'

const AppWidgetLayout = ({
    session,
    children,
    flagsmithState,
    // Layouts must accept a children prop.
    params
}: {
    session?: Session
    children: any
    flagsmithState: any
    params: {
        slug: string
    }
}) => {
    return (
        <FlagsmithProvider
            serverState={flagsmithState}
            options={{
                environmentID: process.env.FLAGSMITH_ENVIRONMENT_ID!
            }}
            flagsmith={flagsmith}
        >
            <ThemeProvider theme={darkModeTheme}>
                <CssBaseline enableColorScheme />
                <GlobalStyles />
                {children}
            </ThemeProvider>
        </FlagsmithProvider>
    )
}

export default AppWidgetLayout
