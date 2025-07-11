import React from 'react'
import { redirect } from 'next/navigation'
import Chat from '@ui/Chat'
import getCachedSession from '@ui/getCachedSession'

export const metadata = {
    title: 'Chats | Answer Agent',
    description: 'Your current Answer Agent chat'
}

const ChatDetailPage = async ({ params }: any) => {
    const session = await getCachedSession()
    const user = session?.user

    // If user has a defaultChatflowId from cookie, redirect to that chat
    if (user?.defaultChatflowId) {
        redirect(`/chat/${user.defaultChatflowId}`)
    }

    const chatcomponent = <Chat {...params} />
    return chatcomponent
}

export default ChatDetailPage
