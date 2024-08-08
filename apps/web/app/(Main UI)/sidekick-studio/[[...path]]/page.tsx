// Import getAppSettings from your utility functions
import React from 'react'
import getCachedSession from '@ui/getCachedSession'
import { redirect } from 'next/navigation'
import dynamic from 'next/dynamic'

const FlowiseApp = dynamic(() => import('flowise-ui/src/AppRoot'), { ssr: false })

export const metadata = {
    title: 'Sidekick Studio | Answers AI',
    description: 'Sidekick Studio'
}

const FlowisePage = async ({ params }: any) => {
    // Fetch app settings

    const session = await getCachedSession()
    const path = params.path?.join('/')

    // if (!session?.flagsmithState.flags?.['chatflow:use']?.enabled) {
    //     redirect('/chat')
    // }
    // if (!path) redirect('/sidekick-studio/chatflows')
    // Extract hostname from appSettings if available
    // const hostname = appSettings?.hostname; // Need to add this to appSettings

    // Construct the URL for the iframe. Adjust the path as needed.

    const { chatflowDomain } = session?.user ?? {}

    // Return the iframe element with the constructed URL
    // Ensure to adjust the width, height, and other attributes as per your requirements
    console.log(session?.user)
    return (
        <>
            <div id='portal' />
            <FlowiseApp organizationId={session?.user?.organizationId} />
        </>
    )
}

export default FlowisePage
