import React from 'react'
import Chat from '@ui/Chat'
import getCachedSession from '@ui/getCachedSession'
import { findSidekicksForChat } from '@utils/findSidekicksForChat'
import { redirect } from 'next/navigation'

export const metadata = {
    title: 'Chats | Answer Agent',
    description: 'Your current Answer Agent chat'
}

const ChatDetailPage = async ({ params }: any) => {
    const session = await getCachedSession()

    if (!session?.user?.email) {
        // Redirect to login with return URL to come back to chat page
        redirect(`/api/auth/login?redirect_uri=${encodeURIComponent('/chat')}`)
    }

    const user = session.user

    try {
        // Fetch sidekicks for the main chat page
        const { sidekicks } = await findSidekicksForChat(user)

        return <Chat {...params} sidekicks={sidekicks} />
    } catch (error) {
        console.error('Error loading sidekicks for main chat page:', error)
        // Even if there's an error, render the Chat component
        return <Chat {...params} />
    }
}

export default ChatDetailPage
