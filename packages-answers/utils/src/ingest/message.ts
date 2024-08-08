import { prisma } from '@db/client'

import { AnswersFilters, User } from 'types'
import { EventVersionHandler } from './EventVersionHandler'
import { openai } from '../openai/client'
import { trackCompletionUsage } from '../openai/usageTracking'

export const answersMessageSent: EventVersionHandler<{
    chatId: string
    messageId?: string
    filters: AnswersFilters
    user: User
    role: string
    content: string
}> = {
    v: '1',
    event: 'answers/message.sent',
    handler: async ({ event }) => {
        const { data, user } = event
        const { role, content, chatId, messageId } = data

        const messages = await prisma.message.findMany({
            where: { chatId: chatId },
            orderBy: { createdAt: 'asc' }
        })
        const history = messages?.map(({ role, content }) => `${role}: ${content}`).join('\n')
        let message
        if (!messageId)
            // TODO: Save more things from the message sent (i.e context, history, completion request, completion response)
            message = await prisma.message.create({
                data: {
                    ...(role == 'user' && user?.email ? { user: { connect: { email: user?.email } } } : {}),
                    chat: { connect: { id: chatId } },
                    role,
                    content: content
                }
            })
        await AIUpdateChatTitle(history, chatId, user)
        return message
    }
}

async function AIUpdateChatTitle(history: string, chatId: string, user?: User) {
    const titlePrompt = `Use the following conversation between a human and an AI assistant. Create a very short title for a story about the human. ${history} TITLE:`
    const req = {
        max_tokens: 20,
        prompt: titlePrompt,
        temperature: 1,
        model: 'text-davinci-003'
    }

    const res = await openai.createCompletion(req)

    user &&
        (await trackCompletionUsage({
            method: 'createCompletion',
            request: req,
            response: res.data,
            user
        }))

    const title = res?.data?.choices?.[0]?.text!
    // console.log('AITITLE', { history, chatId, title });
    await prisma.chat.update({
        where: { id: chatId },
        data: {
            title
        }
    })
}
