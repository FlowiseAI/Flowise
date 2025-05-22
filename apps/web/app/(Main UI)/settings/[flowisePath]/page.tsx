import React from 'react'
import getCachedSession from '@ui/getCachedSession'

export const metadata = {
    title: 'Sidekick Studio | Answer Agent',
    description: 'Sidekick Studio'
}

const FlowisePage = async ({ params }: any) => {
    const session = await getCachedSession()
    const userId = session?.user?.id
    if (!userId) return null

    const flowisePath = params?.flowisePath

    const hostname = process.env.FLOWISE_DOMAIN

    // Return the iframe element with the constructed URL
    // Ensure to adjust the width, height, and other attributes as per your requirements
    return <iframe src={`${hostname}/${flowisePath}`} width='100%' height='100%' frameBorder='0' allowFullScreen></iframe>
}

export default FlowisePage
