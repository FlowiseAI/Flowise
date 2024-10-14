import React from 'react'
import dynamic from 'next/dynamic'
import { parseEncodedDomain } from '@/hooks/useApiHost'

const DynamicView = dynamic(() => import('flowise-ui/src/views/chatbot/index'), {
    ssr: false
})

const Page = ({ params }: { params: { encodedDomain: string; id: string } }) => {
    const apiHost = parseEncodedDomain(params.encodedDomain)

    return (
        <>
            <DynamicView apiHost={apiHost} chatflowId={params.id} />
        </>
    )
}

export default Page
