import getCachedSession from '@ui/getCachedSession'

import { prisma } from '@db/client'

import ChatDrawerClient from './ChatDrawer'

const ChatDrawerServer = async () => {
    const session = await getCachedSession()

    if (!session?.user?.email) return null

    const chatsPromise = prisma.chat
        .findMany({
            where: {
                users: {
                    some: { email: session.user.email }
                },
                organization: { id: session.user.organizationId! },
                chatflowChatId: { not: null },
                journeyId: null
            },
            orderBy: {
                createdAt: 'desc'
            },
            include: {
                prompt: true,
                messages: { orderBy: { createdAt: 'desc' }, take: 1 }
            }
        })
        .then((data: any) => JSON.parse(JSON.stringify(data)))

    const [chats] = await Promise.all([chatsPromise])

    return <ChatDrawerClient chats={chats} />
}

export default ChatDrawerServer
