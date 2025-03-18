import React from 'react'
import { Session } from '@auth0/nextjs-auth0'
import AppLayout from '@ui/AppLayout'

import getCachedSession from '@ui/getCachedSession'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'

const MainUiLayout = async (props: {
    children: React.ReactNode
    params: {
        slug: string
    }
}) => {
    const [session] = await Promise.all([getCachedSession()])

    const headersList = headers()
    const host = headersList.get('host') || ''
    const currentDomain = host.split(':')[0] // Remove port if present
    const userDomain = session ? session?.user?.answersDomain?.split('https://')[1] : null // Remove the protocol

    console.log('userDomain', userDomain, session?.user?.answersDomain, 'currentDomain', currentDomain)

    if (userDomain && userDomain !== currentDomain && !currentDomain.includes('localhost') && !currentDomain.includes('staging.')) {
        console.log('Redirecting to:', session.user.answersDomain, 'from', currentDomain)
        redirect(session.user.answersDomain)
    }

    return (
        <AppLayout
            appSettings={session?.user?.appSettings!}
            // providers={providers}
            session={JSON.parse(JSON.stringify(session as Session))}
            params={props.params}
            flagsmithState={session?.flagsmithState}
        >
            {props.children}
        </AppLayout>
    )
}

export default MainUiLayout
