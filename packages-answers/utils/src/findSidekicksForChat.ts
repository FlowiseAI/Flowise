import { parseChatbotConfig, parseFlowData } from './normalizeSidekick'
import { User } from 'types'

import auth0 from '@utils/auth/auth0'

export async function findSidekicksForChat(user: User) {
    let token
    try {
        const { accessToken } = await auth0.getAccessToken({
            authorizationParams: { organization: user.org_name }
        })
        if (!accessToken) throw new Error('No access token found')
        token = accessToken
    } catch (err) {
        // On error redirect to auth0 sign in

        throw new Error('Unauthorized')
    }
    // CAll the chatflow flowise endpoint with the token
    // Use the chatflowDomain field on the user
    const { chatflowDomain } = user
    try {
        console.log(
            'FetchFlowise',
            `${chatflowDomain}/api/v1/chatflows?filter=${encodeURIComponent(
                JSON.stringify({
                    visibility: 'AnswerAI,Organization'
                })
            )}`
        )
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

            const sidekicks = result.map((chatflow: any) => ({
                // placeholder: sidekick.placeholder || '',
                // tagString: (sidekick.tags || []).map((t) => toSentenceCase(t)).join(', '),
                // tags: (sidekick.tags || []).map((t) => toSentenceCase(t)),
                id: chatflow.id || '',
                // aiModel: sidekick.aiModel || '',
                label: chatflow.name || '',
                // sharedWith: sharedWith,
                // isFavorite: hasFavorited,
                visibility: chatflow?.visibility,
                chatflow: chatflow,
                answersConfig: chatflow?.answersConfig,
                chatflowId: chatflow?.id || '',
                chatflowDomain: chatflowDomain,
                chatbotConfig: parseChatbotConfig(chatflow?.chatbotConfig),
                flowData: parseFlowData(chatflow?.flowData)
            }))

            return sidekicks
        } else {
            const result = await response.text()
            console.log('Chatflow error:', { result })
        }
    } catch (err) {
        console.error('Error fetching chatflows:', err)
        return []
    }
    // const dbSidekicks = await prisma.sidekick.findMany({
    //   where: {
    //     tags: { has: 'flowise' },
    //     NOT: { tags: { has: 'internal' } },
    //     chatflow: {
    //       path: ['answersConfig', 'workflowVisibility'],
    //       array_contains: ['AnswerAI']
    //     },
    //     organization: { id: user.org_id },
    //     OR: [
    //       { createdByUser: { id: user.id } },
    //       {
    //         organization: { id: user.org_id },
    //         chatflow: {
    //           path: ['answersConfig', 'workflowVisibility'],
    //           array_contains: ['Organization']
    //         }s
    //       }
    //     ]
    //   }
    // });

    // const sidekicks = dbSidekicks?.length ? normalizeSidekickList(dbSidekicks, user) : [];
    // return sidekicks;
}
