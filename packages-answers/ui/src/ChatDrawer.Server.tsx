import getCachedSession from '@ui/getCachedSession'
import ChatDrawerClient from './ChatDrawer'
import { getChats } from '@utils/getChats'

const ChatDrawerServer = async () => {
    const session = await getCachedSession()

    if (!session?.user?.email) {
        return null
    }

    const mergedChats = await getChats(session.user)
    return <ChatDrawerClient chats={mergedChats} />
}

export default ChatDrawerServer
