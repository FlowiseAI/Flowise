'use client'
import React from 'react'
import dynamic from 'next/dynamic'

const View = dynamic(() => import('@/views/assistants/openai/OpenAIAssistantLayout'), { ssr: false })

const Page = () => {
    return (
        <>
            <View />
        </>
    )
}

export default Page
