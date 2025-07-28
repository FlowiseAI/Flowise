'use server'
import React from 'react'
import ChatLayout from '@ui/ChatLayout'
import getCachedSession from '@ui/getCachedSession'
import AppProvider from '@/AppProvider'
import AppLayout from 'flowise-ui/src/AppLayout'

export default async function ChatUILayout({ children }: { children: React.ReactNode }) {
    const session = await getCachedSession()
    const apiHost = session?.user?.chatflowDomain

    return (
        <AppProvider apiHost={apiHost} accessToken={session?.accessToken}>
            <AppLayout apiHost={apiHost} accessToken={session?.accessToken}>
                <ChatLayout>{children}</ChatLayout>
            </AppLayout>
        </AppProvider>
    )
}
