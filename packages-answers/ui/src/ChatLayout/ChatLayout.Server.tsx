import React, { Suspense } from 'react'

export default async function ChatUILayout({
    // This will be populated with nested layouts or pages
    chatId,
    journeyId,
    children
}: {
    children: React.ReactNode
    chatId: string
    journeyId: string
}) {
    return <main style={{ display: 'flex', width: '100%', height: '100%' }}>{children}</main>
}
