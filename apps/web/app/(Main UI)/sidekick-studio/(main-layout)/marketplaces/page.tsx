import React from 'react'
import dynamic from 'next/dynamic'

const View = dynamic(() => import('@/views/marketplaces/MarketplaceLanding'), { ssr: false })

const Page = () => {
    return (
        <>
            <View />
        </>
    )
}

export default Page
    