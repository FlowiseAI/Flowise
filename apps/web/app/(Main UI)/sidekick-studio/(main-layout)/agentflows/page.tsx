import React from 'react'
import dynamic from 'next/dynamic'

const View = dynamic(() => import('@/views/agentflows/index'), { ssr: true })

const FlowisePage = () => {
    return (
        <>
            <View />
        </>
    )
}

export default FlowisePage
