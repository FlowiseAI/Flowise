import React from 'react'
import dynamic from 'next/dynamic'
import getCachedSession from '@ui/getCachedSession'

const View = dynamic(() => import('@/views/canvas/index'), { ssr: false })

const Page = async () => {
    const session = await getCachedSession()
    return (
        <>
            <View />
        </>
    )
}

export default Page
