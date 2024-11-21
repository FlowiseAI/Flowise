import { prisma } from '@db/client'
import auth0 from '@utils/auth/auth0'

interface User {
    email: string
    organizationId: string
    organizationName: string
    chatflowDomain: string
}

export async function getChats(user: User) {
    // Get auth token for chatflow API
    let token
    try {
        const { accessToken } = await auth0.getAccessToken({
            authorizationParams: { organization: user.organizationName }
        })
        if (!accessToken) throw new Error('No access token found')
        token = accessToken
    } catch (err) {
        console.error('Auth error:', err)
    }

    // Fetch local chats
    const localChatsPromise = prisma.chat
        .findMany({
            where: {
                users: { some: { email: user.email } },
                organization: { id: user.organizationId },
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

    // Fetch chatflow chats
    const chatflowChatsPromise = token
        ? fetch(`${user.chatflowDomain}/api/v1/chats`, {
              method: 'GET',
              headers: {
                  'Content-Type': 'application/json',
                  Authorization: `Bearer ${token}`
              }
          })
              .then((res) => (res.ok ? res.json() : []))
              .catch((err) => {
                  console.error('Error fetching chatflow chats:', err)
                  return []
              })
        : Promise.resolve([])

    // Wait for both promises to resolve
    const [localChats, chatflowChats] = await Promise.all([localChatsPromise, chatflowChatsPromise])

    // Merge and deduplicate chats
    const mergedChats = [
        // ...localChats
    ]
    if (chatflowChats.length > 0) {
        chatflowChats.forEach((chatflowChat: any) => {
            // Only add if not already in local chats
            if (!localChats.some((local) => local.chatflowChatId === chatflowChat.id)) {
                mergedChats.push({
                    ...chatflowChat,
                    chatflowChatId: chatflowChat.id
                })
            }
        })
    }

    // Sort merged chats by date
    mergedChats.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

    return mergedChats
}
