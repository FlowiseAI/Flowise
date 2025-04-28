import React from 'react'

import Chat from '@ui/Chat'
import getCachedSession from '@ui/getCachedSession'
import { findSidekicksForChat } from '@utils/findSidekicksForChat'

export const metadata = {
    title: 'Chats | Answers AI',
    description: 'Your current Answers AI chat'
}

const ChatDetailPage = async ({ params }: any) => {
    // const session = await getCachedSession()
    // const user = session?.user

    const chatcomponent = <Chat {...params} />
    console.log('chatcomponent', chatcomponent)
    return chatcomponent
}

export default ChatDetailPage
