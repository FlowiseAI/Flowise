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
import HelpChatDrawer from '../HelpChatDrawer'
import { HelpChatProvider } from '../HelpChatContext'
import { UserProvider } from '@auth0/nextjs-auth0/client'

import { Auth0Setup } from '@/hooks/useAuth0Setup'
import React from 'react'

export default function AppLayout({
    session,
    chatList,
    params,
    children,
    flagsmithState,
    noDrawer
}: {
    session?: Session
    appSettings?: AppSettings
    children: React.ReactNode
    chatList?: any
    params?: {
        slug: string
    }
    flagsmithState?: any
    noDrawer?: boolean
}) {
    // const authorizationParams = {
    //     organization: session?.user.organizationId,
    //     redirect_uri: typeof window !== 'undefined' ? window?.location?.origin : '',
    //     audience: process.env.VITE_AUTH_AUDIENCE,
    //     scope: 'openid profile email'
    // }

    return (
        <UserProvider>
            <Auth0Setup apiHost={session?.user?.chatflowDomain} accessToken={session?.accessToken}>
                <FlagsmithProvider
                    serverState={flagsmithState}
                    options={{
                        environmentID: process.env.FLAGSMITH_ENVIRONMENT_ID!
                    }}
                    flagsmith={flagsmith}
                >
                    {/* <Auth0Provider
                        domain={process.env.VITE_AUTH_DOMAIN!}
                        clientId={process.env.VITE_AUTH_CLIENT_ID!}
                        authorizationParams={authorizationParams}
                    > */}
                    <ThemeProvider theme={darkModeTheme}>
                        <HelpChatProvider>
                            <CssBaseline enableColorScheme />
                            <GlobalStyles />
                            <div style={{ display: 'flex', height: '100vh', width: '100vw' }}>
                                {!noDrawer && (
                                    <AppDrawer params={params} session={session} chatList={chatList} flagsmithState={flagsmithState} />
                                )}
                                <div style={{ flex: 1, position: 'relative' }}>
                                    <div style={{ width: '100%', height: '100%', position: 'relative' }}>{children}</div>
                                </div>
                                <HelpChatDrawer
                                    apiHost='https://lastrev.flowise.theanswer.ai'
                                    chatflowid='e24d5572-a27a-40b9-83fe-19a376535b9d'
                                />
                            </div>
                        </HelpChatProvider>
                    </ThemeProvider>
                    {/* </Auth0Provider> */}
                </FlagsmithProvider>
            </Auth0Setup>
        </UserProvider>
    )
}
