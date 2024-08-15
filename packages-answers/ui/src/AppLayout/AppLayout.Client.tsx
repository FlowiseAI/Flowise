'use client'
import { FlagsmithProvider } from 'flagsmith/react'
import flagsmith from 'flagsmith/isomorphic'
import { Session } from '@auth0/nextjs-auth0'

import CssBaseline from '@mui/material/CssBaseline'
import ThemeProvider from '@mui/material/styles/ThemeProvider'

import { AppDrawer } from '../AppDrawer'
import { darkModeTheme } from '../theme'
import GlobalStyles from '../GlobalStyles'

import { AppSettings } from 'types'
import { Auth0Provider } from '@auth0/auth0-react'

export default function AppLayout({
    session,
    chatList,
    params,
    children,
    flagsmithState
}: {
    session?: Session
    appSettings: AppSettings
    // providers: Record<string, ClientSafeProvider> | null;
    children: any
    chatList: any
    params: {
        slug: string
    }
    flagsmithState: any
}) {
    const authorizationParams = {
        organization: session?.user.organizationId,
        redirect_uri: typeof window !== 'undefined' ? window?.location?.origin : '',
        audience: process.env.VITE_AUTH_AUDIENCE,
        scope: 'openid profile email'
    }
    return (
        <FlagsmithProvider
            serverState={flagsmithState}
            options={{
                environmentID: process.env.FLAGSMITH_ENVIRONMENT_ID!
            }}
            flagsmith={flagsmith}
        >
            <Auth0Provider
                domain={process.env.VITE_AUTH_DOMAIN}
                clientId={process.env.VITE_AUTH_CLIENT_ID}
                authorizationParams={authorizationParams}
            >
                <ThemeProvider theme={darkModeTheme}>
                    <CssBaseline enableColorScheme />
                    <GlobalStyles />
                    <>
                        <AppDrawer params={params} session={session} chatList={chatList} flagsmithState={flagsmithState} />
                        <div
                            style={{
                                flex: 1,
                                width: 'calc(100% - 65px)',
                                height: '100vh',
                                position: 'relative'
                            }}
                        >
                            <div
                                style={{
                                    width: '100%',
                                    height: '100vh',
                                    position: 'relative'
                                }}
                            >
                                {children}
                            </div>
                        </div>
                    </>
                </ThemeProvider>
            </Auth0Provider>
        </FlagsmithProvider>
    )
}
