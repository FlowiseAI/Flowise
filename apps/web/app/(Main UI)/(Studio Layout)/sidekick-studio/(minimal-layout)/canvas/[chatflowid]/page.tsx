import React from 'react'
import dynamic from 'next/dynamic'
const View = dynamic(() => import('@/views/canvas/index'), { ssr: false })

const Page = ({ params }: { params: { chatflowid: string } }) => {
    return (
        <>
            <View chatflowid={params.chatflowid} />
        </>
    )
}

export default Page
