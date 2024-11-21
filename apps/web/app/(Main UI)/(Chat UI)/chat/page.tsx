import React from 'react'

import Chat from '@ui/Chat'
import getCachedSession from '@ui/getCachedSession'
import { findSidekicksForChat } from '@utils/findSidekicksForChat'

export const metadata = {
    title: 'Chats | Answers AI',
    description: 'Your current Answers AI chat'
}

const ChatDetailPage = async ({ params }: any) => {
    const session = await getCachedSession()
    const user = session?.user

    if (!user) {
        return <Chat {...params} />
    }
    try {
        const { sidekicks } = (await findSidekicksForChat(user)) ?? {}
        // @ts-expect-error Async Server Component
        return <Chat {...params} sidekicks={sidekicks} />
    } catch (error) {
        console.error(error)
        return <Chat {...params} />
    }
}

export default ChatDetailPage
