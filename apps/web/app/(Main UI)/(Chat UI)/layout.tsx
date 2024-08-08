'use server'
import React from 'react'
import ChatLayout from '@ui/ChatLayout'

export default async function ChatUILayout({
    // This will be populated with nested layouts or pages
    children
}: {
    children: React.ReactNode
}) {
    return (
        <>
            {/* @ts-expect-error */}
            <ChatLayout>{children}</ChatLayout>
        </>
    )
}
