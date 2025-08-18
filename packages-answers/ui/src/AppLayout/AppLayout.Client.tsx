'use client'
import { FlagsmithProvider } from 'flagsmith/react'
import flagsmith from 'flagsmith/isomorphic'
import { Session } from '@auth0/nextjs-auth0'

import CssBaseline from '@mui/material/CssBaseline'
import ThemeProvider from '@mui/material/styles/ThemeProvider'

import { darkModeTheme } from '../theme'
import GlobalStyles from '../GlobalStyles'

import { AppSettings } from 'types'
import { UserProvider } from '@auth0/nextjs-auth0/client'
import { Auth0Setup } from '@/hooks/useAuth0Setup'
import dynamic from 'next/dynamic'
const HelpChatDrawer = dynamic(() => import('../HelpChatDrawer'), { ssr: false })
const HelpChatProvider = dynamic(() => import('../HelpChatContext').then((mod) => mod.HelpChatProvider), {
    ssr: false
})
const AppDrawer = dynamic(() => import('../AppDrawer'))
const SubscriptionDialogProvider = dynamic(() => import('../SubscriptionDialogContext').then((mod) => mod.SubscriptionDialogProvider), {
    ssr: false
})

import React from 'react'
import { useFlagsmith, useFlags } from 'flagsmith/react'

function FlagsmithDebug({ session }: { session?: Session }) {
    const flagsmithClient = useFlagsmith()
    const flags = useFlags(['flagsmith_debug'])

    React.useEffect(() => {
        if (typeof window === 'undefined') return
        try {
            // derive identity same as server
            const email = session?.user?.email || ''
            const orgId = (session as any)?.user?.organizationId
            const hash = email
                ? email.split('').reduce((a: any, b: any) => {
                      a = (a << 5) - a + b.charCodeAt(0)
                      return a & a
                  }, 0)
                : ''
            const identity = `user_${orgId}_${hash}`

            const currentIdentity = (flagsmithClient as any).identity
            if (!currentIdentity || currentIdentity !== identity) {
                const traits = (session as any)?.user?.roles
                    ? {
                          env: 'production',
                          organization: orgId,
                          roles: ((session as any)?.user?.roles || []).join(',') ?? '',
                          invited: !!(session as any)?.user?.invited,
                          domain: email.split('@')[1] || ''
                      }
                    : undefined
                // identify will refetch flags for this identity
                flagsmithClient.identify(identity as any, traits as any)
            }

            ;(window as any).__flagsmith = flagsmithClient

            // Check if debug flag is enabled OR if in development mode (fallback)
            const shouldShowDebug = flags.flagsmith_debug?.enabled || process.env.NODE_ENV === 'development'

            if (shouldShowDebug) {
                const all = flagsmithClient.getAllFlags()
                const enabled = Object.entries(all)
                    .filter(([, f]: any) => f?.enabled)
                    .map(([k, f]: any) => ({ flag: k, value: f?.value ?? true }))

                // eslint-disable-next-line no-console
                console.log('🚩 Flagsmith Debug Information')
                // eslint-disable-next-line no-console
                console.log('Environment ID:', process.env.FLAGSMITH_ENVIRONMENT_ID)
                // eslint-disable-next-line no-console
                console.log('Identity:', (flagsmithClient as any).identity)
                // eslint-disable-next-line no-console
                console.log('Environment:', process.env.NODE_ENV)
                // eslint-disable-next-line no-console
                console.log('Debug enabled by flag:', !!flags.flagsmith_debug?.enabled)
                // eslint-disable-next-line no-console
                console.table(enabled)
            }
        } catch (e) {
            // noop
        }
    }, [flagsmithClient, session, flags.flagsmith_debug])
    return null
}

export default function AppLayout({
    session,

    params,
    children,
    flagsmithState,
    noDrawer
}: {
    session?: Session
    appSettings?: AppSettings
    children: React.ReactNode

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
                    <FlagsmithDebug session={session} />
                    {/* <Auth0Provider
                        domain={process.env.VITE_AUTH_DOMAIN!}
                        clientId={process.env.VITE_AUTH_CLIENT_ID!}
                        authorizationParams={authorizationParams}
                    > */}
                    <ThemeProvider theme={darkModeTheme}>
                        <CssBaseline enableColorScheme />
                        <GlobalStyles />
                        <SubscriptionDialogProvider>
                            <div style={{ display: 'flex', height: '100vh', width: '100vw', overflow: 'hidden', overflowY: 'auto' }}>
                                {!noDrawer && <AppDrawer params={params} session={session} flagsmithState={flagsmithState} />}
                                <div style={{ flex: 1, position: 'relative', overflow: 'auto' }}>
                                    <div style={{ width: '100%', position: 'relative' }}>{children}</div>
                                </div>
                                <React.Suspense fallback={<div>Loading...</div>}>
                                    <HelpChatProvider>
                                        <HelpChatDrawer
                                            apiHost='https://lr-production.studio.theanswer.ai'
                                            chatflowid='e24d5572-a27a-40b9-83fe-19a376535b9d'
                                        />
                                    </HelpChatProvider>
                                </React.Suspense>
                            </div>
                        </SubscriptionDialogProvider>
                    </ThemeProvider>
                    {/* </Auth0Provider> */}
                </FlagsmithProvider>
            </Auth0Setup>
        </UserProvider>
    )
}
