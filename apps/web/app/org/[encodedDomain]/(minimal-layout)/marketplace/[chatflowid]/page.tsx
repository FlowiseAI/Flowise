'use client'

import React from 'react'
import dynamic from 'next/dynamic'
const View = dynamic(() => import('@/views/marketplaces/MarketplaceLanding'), { ssr: false })

interface PageProps {
    params: {
        chatflowid: string
    }
}

const Page: React.FC<PageProps> = ({ params }) => {
    const { chatflowid } = params
    return (
        <>
            <View templateId={chatflowid} />
        </>
    )
}

export default Page
