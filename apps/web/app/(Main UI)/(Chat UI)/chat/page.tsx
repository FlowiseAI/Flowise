import React from 'react'

import Chat from '@ui/Chat'
import getCachedSession from '@ui/getCachedSession'
import { findSidekicksForChat } from '@utils/findSidekicksForChat'

export const metadata = {
    title: 'Chats | Answer Agent',
    description: 'Your current Answer Agent chat'
}

const ChatDetailPage = async ({ params }: any) => {
    // const session = await getCachedSession()
    // const user = session?.user

    const chatcomponent = <Chat {...params} />
    // console.log('chatcomponent', chatcomponent)
    return chatcomponent
}

export default ChatDetailPage
