import AppWidgetLayout from '@ui/AppWidgetLayout'
import React from 'react'
import flagsmith from 'flagsmith/isomorphic'
import getCachedSession from '@ui/getCachedSession'
import { Session } from '@auth0/nextjs-auth0'

const WidgetLayout = async ({
    // Layouts must accept a children prop.
    params,
    // This will be populated with nested layouts or pages
    children
}: {
    children: React.ReactNode
    params: {
        slug: string
    }
}) => {
    const session = await getCachedSession()

    return (
        <AppWidgetLayout session={session as Session} params={params} flagsmithState={session?.flagsmithState}>
            {children}
        </AppWidgetLayout>
    )
}

export default WidgetLayout
