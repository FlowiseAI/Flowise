import React from 'react'
import { Poppins } from 'next/font/google'

const poppins = Poppins({
    weight: ['100', '300', '400', '700'],
    subsets: ['latin'],
    display: 'swap',

    variable: '--font-poppins'
})

export default async function RootLayout({
    // This will be populated with nested layouts or pages
    children
}: {
    children: React.ReactNode
}) {
    if (!children) return null
    // console.log(
    //   'LAYOUT ========================================================================================'
    // );

    return (
        <html className={poppins.className} lang='en' style={{ height: '100%', width: '100%', flex: 1, display: 'flex' }}>
            <body style={{ height: '100%', width: '100%', flex: 1, display: 'flex' }}>{children}</body>
        </html>
    )
}
