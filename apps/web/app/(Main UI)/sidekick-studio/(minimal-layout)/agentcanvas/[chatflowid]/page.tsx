import React from 'react'
import View from '@/views/canvas/index'

interface ViewProps {
    chatflowid: string
}

const Page = ({ params }: { params: { chatflowid: string } }) => {
    return (
        <>
            <View chatflowid={params.chatflowid} />
        </>
    )
}

export default Page
