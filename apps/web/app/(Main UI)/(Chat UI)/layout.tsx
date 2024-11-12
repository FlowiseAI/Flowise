'use server'
import React from 'react'
import ChatLayout from '@ui/ChatLayout'
import getCachedSession from '@ui/getCachedSession'
import AppProvider from '@/AppProvider'

export default async function ChatUILayout({
    // This will be populated with nested layouts or pages
    children
}: {
    children: React.ReactNode
}) {
    const session = await getCachedSession()
    const apiHost = session?.user?.chatflowDomain

    return (
        <>
            {/* @ts-expect-error */}
            <AppProvider apiHost={apiHost} accessToken={session?.accessToken}>
                <ChatLayout>{children}</ChatLayout>
            </AppProvider>
        </>
    )
}
