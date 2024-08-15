import React from 'react'
import dynamic from 'next/dynamic'

const View = dynamic(() => import('@/views/docstore/VectorStoreConfigure'), { ssr: true })

const Page = () => {
    return (
        <>
            <View />
        </>
    )
}

export default Page
