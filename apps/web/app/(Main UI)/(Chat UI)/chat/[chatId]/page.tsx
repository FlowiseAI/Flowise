import React from 'react'
import { prisma } from '@db/client'
import Chat from '@ui/Chat'
import ChatNotFound from '@ui/ChatNotFound'
import getCachedSession from '@ui/getCachedSession'
import { findSidekicksForChat } from '@utils/findSidekicksForChat'
import auth0 from '@utils/auth/auth0'
import type { Chatflow, Chat as ChatType, User } from 'types'

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

    // Check if id corresponds to a valid chat
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

    const [chatflowChat] = await Promise.all([chatflowChatPromise])

    // Return chatflow chat if local chat doesn't exist
    if (chatflowChat) {
        return {
            ...chatflowChat,
            chatflowChatId: chatflowChat.id
        }
    }

    // If no Chat, check if it's a chatflow ID
    const chatflow: Chatflow = await (token
        ? fetch(`${user.chatflowDomain}/api/v1/chatflows/${chatId}`, {
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
        : Promise.resolve(null))

    if (chatflow) {
        return {
            chatflowId: chatflow.id,
            sidekickId: chatflow.id
        }
    }
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
        // console.log('Token', accessToken)
        // console.log('Result', result)
        if (!result.ok) {
            const error = new Error('Failed to fetch messages')
            throw error
        }

        let messages: any[] = []
        try {
            messages = await result.json()
        } catch (err) {
            console.error('Error parsing messages:', err)
        }
        // console.log('Messages', messages)
        return messages?.map((m: any) => ({
            ...m,
            // agentReasoning: JSON.parse(m.agentReasoning ?? '[]'),
            // usedTools: JSON.parse(m.usedTools ?? '[]'),
            // contextDocuments: JSON.parse(m.sourceDocuments ?? '[]'),
            fileUploads: (m.fileUploads as any[])?.map((f: any) => ({
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
    title: 'Chats | Answer Agent',
    description: 'Your current Answer Agent chat'
}

const ChatDetailPage = async ({ params }: { params: { chatId: string } }) => {
    const session = await getCachedSession()

    if (!session?.user?.email) {
        return <ChatNotFound />
    }

    const user = session.user
    let sidekicks: any[] = []

    try {
        const [chat] = await Promise.all([getChat(params.chatId, user)])

        if (!chat) {
            return <ChatNotFound />
        }

        // Fetch messages after we have the chat
        const messages = await getMessages(chat, user)
        const chatWithMessages = {
            ...chat,
            messages
        }

        // console.log('Chat', chat)

        // Chat without credential issues - use regular Chat component
        // The Chat component will handle credential checking using useCredentialChecker hook
        return <Chat {...params} chat={chatWithMessages} journey={chatWithMessages?.journey} sidekicks={sidekicks} />
    } catch (error) {
        console.error('Error loading chat:', error)
        // Even if there's an error, still pass the sidekicks if we have them
        return <Chat {...params} sidekicks={sidekicks} />
    }
}

export default ChatDetailPage
