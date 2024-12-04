'use server'
import React from 'react'
import ChatLayout from '@ui/ChatLayout'
import getCachedSession from '@ui/getCachedSession'
import AppProvider from '@/AppProvider'

export default async function ChatUILayout({ children }: { children: React.ReactNode }) {
    const session = await getCachedSession()
    const apiHost = session?.user?.chatflowDomain

    return (
        <AppProvider apiHost={apiHost} accessToken={session?.accessToken}>
            <ChatLayout>{children}</ChatLayout>
        </AppProvider>
    )
}
