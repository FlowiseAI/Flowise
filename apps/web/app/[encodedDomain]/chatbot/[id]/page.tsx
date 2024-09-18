'use client'

import React from 'react'
import dynamic from 'next/dynamic'

const DynamicView = dynamic(() => import('flowise-ui/src/views/chatbot/index'), {
    ssr: false
})

const Page = ({ params }: { params: { encodedDomain: string; id: string } }) => {
    const apiHost = React.useMemo(() => {
        const decodedDomain = decodeURIComponent(params.encodedDomain)
        try {
            const decoded = atob(decodedDomain)
            return decoded.startsWith('http') ? decoded : `https://${decoded}`
        } catch (error) {
            console.warn('Failed to decode base64 domain, using as-is:', decodedDomain, error)
            return decodedDomain.startsWith('http') ? decodedDomain : `https://${decodedDomain}`
        }
    }, [params.encodedDomain])

    return (
        <>
            <DynamicView apiHost={apiHost} chatflowId={params.id} />
        </>
    )
}

export default Page
