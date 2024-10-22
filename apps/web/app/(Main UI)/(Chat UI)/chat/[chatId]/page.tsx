import React from 'react'
import { prisma } from '@db/client'
import Chat from '@ui/Chat'
import ChatNotFound from '@ui/ChatNotFound'
import getCachedSession from '@ui/getCachedSession'

import { findSidekicksForChat } from '@utils/findSidekicksForChat'
import auth0 from '@utils/auth/auth0'
import { User } from 'types'

const getMessages = async ({ chat, user }: { chat: Partial<Chat>; user: User }) => {
    try {
        const { id, chatflowChatId } = chat
        const { accessToken } = await auth0.getAccessToken({
            authorizationParams: { organization: user.org_name }
        })
        if (!accessToken) throw new Error('No access token found')
        const { chatflowDomain } = user
        if (!chatflowChatId) throw new Error('No chatflow chat id found')
        console.log('FetchFlowise', chatflowDomain + `/api/v1/chatmessage?chatId=${chatflowChatId}`)
        const result = await fetch(chatflowDomain + `/api/v1/chatmessage?chatId=${chatflowChatId}`, {
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${accessToken}`
            }
        })
        const messages = await result.json()
        if (!result.ok) {
            const error = new Error(messages.message)
            error.status = messages.status
            throw error
        }
        return messages?.map((m: any) => ({
            ...m,
            contextDocuments: m.sourceDocuments ? JSON.parse(m.sourceDocuments) : []
        }))
    } catch (err) {
        console.error('Error fetching messages', err)
        throw err
    }
}
export const metadata = {
    title: 'Chats | Answers AI',
    description: 'Your current Answers AI chat'
}

const ChatDetailPage = async ({ params }: any) => {
    const session = await getCachedSession()

    if (!session?.user?.email) {
        return <ChatNotFound />
    }

    const user = session?.user
    const userId = user?.id

    const getChatPromise = prisma.chat.findUnique({
        where: {
            id: params.chatId,
            users: {
                some: {
                    id: userId
                }
            }
        },
        include: {
            users: { select: { id: true, email: true, image: true, name: true } }
        }
    })
    try {
        const [chat, sidekicks] = await Promise.all([getChatPromise, findSidekicksForChat(user)])

        if (!chat) {
            return <ChatNotFound />
        }
        // @ts-ignore
        chat.messages = await getMessages({ user, chat })
        // @ts-expect-error Async Server Component
        return <Chat {...params} chat={chat} journey={(chat as any)?.journey} sidekicks={sidekicks} />
    } catch (error) {
        console.error(error)
        return <Chat {...params} />
    }
}

export default ChatDetailPage
