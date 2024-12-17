import React from 'react'
import { prisma } from '@db/client'
import Chat from '@ui/Chat'
import ChatNotFound from '@ui/ChatNotFound'
import getCachedSession from '@ui/getCachedSession'
import { findSidekicksForChat } from '@utils/findSidekicksForChat'
import auth0 from '@utils/auth/auth0'
import type { Chat as ChatType, User } from 'types'

async function getChat(chatId: string, user: User) {
    // Get auth token for chatflow API
    let token
    try {
        const { accessToken } = await auth0.getAccessToken({
            authorizationParams: { organization: user.org_name }
        })
        if (!accessToken) throw new Error('No access token found')
        token = accessToken
    } catch (err) {
        console.error('Auth error:', err)
    }

    // Fetch local chat
    const localChatPromise = prisma.chat.findUnique({
        where: {
            id: chatId,
            users: {
                some: {
                    id: user.id
                }
            }
        },
        include: {
            users: { select: { id: true, email: true, image: true, name: true } }
        }
    })

    // Fetch chatflow chat
    const chatflowChatPromise = token
        ? fetch(`${user.chatflowDomain}/api/v1/chats/${chatId}`, {
              headers: {
                  'Content-Type': 'application/json',
                  Authorization: `Bearer ${token}`
              }
          })
              .then((res) => (res.ok ? res.json() : null))
              .catch((err) => {
                  console.error('Error fetching chatflow chat:', err)
                  return null
              })
        : Promise.resolve(null)

    const [localChat, chatflowChat] = await Promise.all([localChatPromise, chatflowChatPromise])

    // Return chatflow chat if local chat doesn't exist
    if (!localChat && chatflowChat) {
        return {
            ...chatflowChat,
            chatflowChatId: chatflowChat.id
        }
    }

    return localChat
}

async function getMessages(chat: Partial<ChatType>, user: User) {
    if (!chat?.chatflowChatId) return []

    try {
        const { accessToken } = await auth0.getAccessToken({
            authorizationParams: { organization: user.org_name }
        })
        if (!accessToken) throw new Error('No access token found')

        const result = await fetch(`${user.chatflowDomain}/api/v1/chatmessage?chatId=${chat.chatflowChatId}`, {
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${accessToken}`
            }
        })

        if (!result.ok) {
            const error = new Error('Failed to fetch messages')
            throw error
        }

        const messages = await result.json()
        return messages?.map((m: any) => ({
            ...m,
            agentReasoning: m.agentReasoning ? JSON.parse(m.agentReasoning) : [],
            usedTools: m.usedTools ? JSON.parse(m.usedTools) : [],
            contextDocuments: m.sourceDocuments ? JSON.parse(m.sourceDocuments) : [],
            fileUploads: (m.fileUploads ? JSON.parse(m.fileUploads) : [])?.map((f: any) => ({
                ...f,
                data: `${user.chatflowDomain}/api/v1/get-upload-file?chatflowId=${m.chatflowid}&chatId=${chat.chatflowChatId}&fileName=${f.name}`
            }))
        }))
    } catch (err) {
        console.error('Error fetching messages:', err)
        return []
    }
}

export const metadata = {
    title: 'Chats | Answers AI',
    description: 'Your current Answers AI chat'
}

const ChatDetailPage = async ({ params }: { params: { chatId: string } }) => {
    const session = await getCachedSession()

    if (!session?.user?.email) {
        return <ChatNotFound />
    }

    const user = session.user

    try {
        // Fetch chat, messages and sidekicks in parallel
        const [chat, { sidekicks } = {}] = await Promise.all([getChat(params.chatId, user), findSidekicksForChat(user)])

        if (!chat) {
            return <ChatNotFound />
        }

        // Fetch messages after we have the chat
        const messages = await getMessages(chat, user)
        const chatWithMessages = {
            ...chat,
            messages
        }

        return <Chat {...params} chat={chatWithMessages} journey={chatWithMessages?.journey} sidekicks={sidekicks} />
    } catch (error) {
        console.error(error)
        return <Chat {...params} />
    }
}

export default ChatDetailPage
