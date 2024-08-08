import { prisma } from '@db/client'
import { Chat } from 'db/generated/prisma-client'
import { Message } from 'types'

import { EventVersionHandler } from './EventVersionHandler'

export const answersPromptUpserted: EventVersionHandler<{ prompt: string; chat: Chat }> = {
    v: '1',
    event: 'answers/prompt.upserted',
    handler: async ({ event }) => {
        const { data, user, ts } = event

        const userId = user?.id
        if (!userId) throw new Error('No user')

        const { prompt, chat } = data
        const chatId = chat?.id

        if (!chatId) throw new Error('No chat')

        const savedPrompt = await prisma.prompt.findUnique({ where: { content: prompt } })

        await prisma.prompt.upsert({
            where: { content: prompt },
            create: {
                chat: { connect: { id: chatId } },
                users: { connect: { id: userId } },
                title: prompt,
                content: prompt,
                likes: 0,
                usages: 1,
                createdAt: new Date(ts)
            },
            update: {
                answers: undefined,
                content: undefined,
                chat: { connect: { id: chatId } },
                users: { connect: { id: userId } },
                usages: (savedPrompt?.usages || 0) + 1
            }
        })
    }
}

export const answersPromptAnswered: EventVersionHandler<{
    prompt: string
    message: Message
}> = {
    v: '1',
    event: 'answers/prompt.answered',
    handler: async ({ event }) => {
        const {
            ts,
            data: { prompt, message }
        } = event

        // const answerMessage = await prisma.message.create({
        //   data: {
        //     content: answer,
        //     prompt: { connect: { content: prompt } },
        //     chat: { connect: { id: chat.id } },
        //     createdAt: new Date(ts)
        //   }
        // });

        await prisma.prompt.update({
            where: { content: prompt },
            data: {
                answers: {
                    connect: { id: message.id }
                }
            }
        })
    }
}
