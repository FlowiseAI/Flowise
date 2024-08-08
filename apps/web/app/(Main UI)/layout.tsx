import React from 'react'
import { Session } from '@auth0/nextjs-auth0'
import AppLayout from '@ui/AppLayout'

import getCachedSession from '@ui/getCachedSession'

const MainUiLayout = async (props: {
    children: React.ReactNode
    params: {
        slug: string
    }
}) => {
    const [session] = await Promise.all([getCachedSession()])

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
