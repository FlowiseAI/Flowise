import React from 'react'
import Chat from '@ui/Chat'
import ChatRedirectHandler from '@ui/ChatRedirectHandler'

export const metadata = {
    title: 'Chats | Answer Agent',
    description: 'Your current Answer Agent chat'
}

const ChatDetailPage = async ({ params }: any) => {
    const chatcomponent = (
        <>
            <ChatRedirectHandler />
            <Chat {...params} />
        </>
    )
    return chatcomponent
}

export default ChatDetailPage
