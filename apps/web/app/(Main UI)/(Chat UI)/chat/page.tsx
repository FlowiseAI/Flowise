import React from 'react'
import Chat from '@ui/Chat'

export const metadata = {
    title: 'Chats | Answer Agent',
    description: 'Your current Answer Agent chat'
}

const ChatDetailPage = async ({ params }: any) => {
    const chatcomponent = (
        <>
            <Chat {...params} />
        </>
    )
    return chatcomponent
}

export default ChatDetailPage
