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

    // TODO: Check if the user is accessing the correct answeraiDomain
    // Get the current domain from the request
    // Check if the domain is the same as the answeraiDomain
    // If not, redirect to the correct domain
    // If yes, continue
    // If no answeraiDomain, continue
    // If no session, continue
    // If no session, redirect to the login page
    const headersList = headers()
    const host = headersList.get('host') || ''
    const currentDomain = host.split(':')[0] // Remove port if present
    if (session?.user?.answersDomain !== currentDomain && !currentDomain.includes('localhost') && !currentDomain.includes('staging.')) {
        console.log('Redirecting to:', session.user.answersDomain)
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
