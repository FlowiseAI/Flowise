import { parseChatbotConfig, parseFlowData } from './normalizeSidekick'
import { User } from 'types'
import { prisma } from '@db/client'
import auth0 from '@utils/auth/auth0'

interface Sidekick {
    id: string
    label: string
    visibility: string[]
    chatflow: any
    answersConfig: any
    chatflowId: string
    chatflowDomain: string
    chatbotConfig: any
    flowData: any
    isRecent: boolean
    category: string
    isAvailable: boolean
    isFavorite: boolean
}

export async function findSidekicksForChat(user: User) {
    let token
    try {
        const { accessToken } = await auth0.getAccessToken({
            authorizationParams: { organization: user.org_name }
        })
        if (!accessToken) throw new Error('No access token found')
        token = accessToken
    } catch (err) {
        throw new Error('Unauthorized')
    }

    // Fetch user chats from the database
    const userChats = await prisma.chat.findMany({
        where: {
            users: { some: { email: user.email } },
            organization: { id: user.org_id }
        },
        select: {
            id: true
        }
    })

    const { chatflowDomain } = user
    try {
        const response = await fetch(
            `${chatflowDomain}/api/v1/chatflows?filter=${encodeURIComponent(
                JSON.stringify({
                    visibility: 'AnswerAI,Organization'
                })
            )}`,
            {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                }
            }
        )

        if (response.ok) {
            const result = await response.json()

            const sidekicks: Sidekick[] = result.map((chatflow: any) => {
                const categories = (chatflow.categories || chatflow.category ? [chatflow.category] : [])
                    .filter(Boolean)
                    .map((c) => c.trim().split(';'))
                    .flat()
                return {
                    id: chatflow.id || '',
                    label: chatflow.name || '',
                    visibility: chatflow.visibility || [],
                    chatflow: chatflow,
                    answersConfig: chatflow.answersConfig,
                    chatflowId: chatflow.id || '',
                    chatflowDomain: chatflowDomain,
                    chatbotConfig: parseChatbotConfig(chatflow.chatbotConfig),
                    flowData: parseFlowData(chatflow.flowData),
                    isRecent: userChats.some((chat) => chat.chatflowId === chatflow.id),
                    category: chatflow.category,
                    categories,
                    isAvailable: chatflow.isPublic || chatflow.visibility.includes('Organization'),
                    isFavorite: false // This will be managed client-side
                }
            })

            return {
                sidekicks,
                categories: getUniqueCategories(sidekicks)
            }
        } else {
            const result = await response.json()
            console.error('Chatflow error:', { result })
            if (result.statusCode == 401) throw new Error('Unauthorized')
            return { sidekicks: [], categories: { top: [], more: [] } }
        }
    } catch (err) {
        console.error('Error fetching chatflows:', err)
    }
}

function getUniqueCategories(sidekicks: Sidekick[]) {
    const categories = [...new Set(sidekicks.map((s) => s.category))]
        .filter(Boolean)
        .map((c) => c.trim().split(';'))
        .flat()
    const topCategories = categories.slice(0, 3)
    const moreCategories = categories.slice(3)

    return {
        top: topCategories,
        more: moreCategories
    }
}
