'use client'
import React from 'react'
import dynamic from 'next/dynamic'

const View = dynamic(() => import('@/views/assistants/custom/CustomAssistantConfigurePreview'), { ssr: false })

const Page = ({ params }: { params: { id: string } }) => {
    return (
        <>
            <View />
        </>
    )
}

export default Page
