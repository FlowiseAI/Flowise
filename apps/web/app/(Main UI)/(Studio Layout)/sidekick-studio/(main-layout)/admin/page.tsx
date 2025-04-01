import React from 'react'
import dynamic from 'next/dynamic'

const View = dynamic(() => import('@/views/admin'), { ssr: true })

const Page = () => {
    return (
        <>
            <View />
        </>
    )
}

export default Page
