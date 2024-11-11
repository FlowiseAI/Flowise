'use client'

import React from 'react'
import dynamic from 'next/dynamic'
import { useRouter } from 'next/navigation'
const View = dynamic(() => import('@/views/marketplaces/MarketplaceLanding'), { ssr: false })

interface PageProps {
    params: {
        chatflowid: string
    }
}

const Page: React.FC<PageProps> = ({ params }) => {
    const { chatflowid } = params
    const router = useRouter()

    const handleClose = () => {
        router.back()
    }

    return (
        <>
            <View
                templateId={chatflowid}
                isDialog={false}
                onClose={handleClose}
                onUse={(template) => {
                    // Handle use case if needed
                    console.log('Template used:', template)
                }}
            />
        </>
    )
}

export default Page
