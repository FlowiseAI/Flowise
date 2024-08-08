import React from 'react'
import getCachedSession from '@ui/getCachedSession'

import ChatWidget from '@ui/ChatWidget'

const WidgetChatPage = async ({ params }: any) => {
    const session = await getCachedSession()
    return <ChatWidget {...params} session={session} />
}

export default WidgetChatPage
