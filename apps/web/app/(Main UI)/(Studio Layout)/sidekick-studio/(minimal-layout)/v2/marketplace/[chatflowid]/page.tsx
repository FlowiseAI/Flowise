'use client'

import dynamic from 'next/dynamic'

const View = dynamic(() => import('@/views/agentflowsv2/MarketplaceCanvas'), { ssr: false })

interface PageProps {
    params: {
        chatflowid: string
    }
}

const Page = ({ params }: PageProps) => {
    const { chatflowid } = params

    return (
        <>
            <View templateId={chatflowid} />
        </>
    )
}

export default Page
