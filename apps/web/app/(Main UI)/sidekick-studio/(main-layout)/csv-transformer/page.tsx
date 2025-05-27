import React from 'react'
import dynamic from 'next/dynamic'

const View = dynamic(() => import('@ui/CsvTransfomer'), { ssr: false })

const Page = () => {
    return (
        <>
            <View />
        </>
    )
}

export default Page
