import React from 'react'

export default async function ChatUILayout({
    // This will be populated with nested layouts or pages

    children
}: {
    children: React.ReactNode
}) {
    return <main style={{ display: 'flex', width: '100%', height: '100%' }}>{children}</main>
}
