import getCachedSession from '@ui/getCachedSession'

import { prisma } from '@db/client'
import { getFlowisePredictionStream } from '@utils/FlowiseStream'
import { upsertChat } from '@utils/upsertChat'

import auth0 from '@utils/auth/auth0'

export async function POST(req: Request) {
    try {
        const session = await getCachedSession()
        const user = session?.user!
        if (!user?.email) {
            return Response.redirect('/', 401)
        }

        // const activeUserPlan = await getActiveUserPlan(user);

        // const { tokensLeft: remainingTokens } = activeUserPlan;

        // if (remainingTokens <= 0) {
        //   return new Response(
        //     JSON.stringify({
        //       message: 'Plan limit exceeded',
        //       code: 'plan-limit-exceeded'
        //     }),
        //     { status: 402 }
        //   );
        // }

        const {
            // journeyId,
            chatId,
            // filters,
            prompt,
            messages,
            sidekick
        } = await req.json()

        const sidekickId = sidekick?.id
        // console.log('POST /api/ai/stream', {
        //     user: user.id,
        //     chatId,
        //     organzation: user.organizationId,
        //     sidekickId
        // })

        const { accessToken } = await auth0.getAccessToken({
            authorizationParams: { organization: user.organizationId }
        })
        if (!accessToken) throw new Error('No access token found')

        const stream = await getFlowisePredictionStream({
            sidekick,
            accessToken,
            body: {
                chatId,
                question: prompt,
                history: messages?.map(({ content, role }: any) => ({
                    message: content,
                    type: role == 'assistant' ? 'apiMessage' : 'userMessage'
                }))
            },
            onEnd: async (result: any) => {
                try {
                    const chat = await upsertChat({
                        id: chatId,
                        user,
                        // filters: filters,
                        prompt,
                        // journeyId,
                        sidekick,
                        chatflowChatId: result.chatId
                    })

                    return { chat }
                } catch (err) {
                    console.log('ErrorOnEnd', err)
                }
            }
        })
        return new Response(stream, {
            headers: { 'Content-Type': 'text/html; charset=utf-8' }
        })
    } catch (error: any) {
        // TODO: Register Chat errors to Sentry under special tag
        return new Response(
            JSON.stringify({
                message: 'There was an error replying to your message. Please try again.',
                code: error.message
            }),
            { status: 422 }
        )
    }
}
