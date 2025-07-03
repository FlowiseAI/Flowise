'use client'

import React from 'react'
import dynamic from 'next/dynamic'

const View = dynamic(() => import('@/views/agentflowsv2/Canvas'), { ssr: false })

const Page = () => {
    return (
        <>
            <View />
        </>
    )
}

export default Page
