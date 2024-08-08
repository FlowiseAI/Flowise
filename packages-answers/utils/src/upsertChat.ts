import { prisma } from '@db/client'
import { Chat, Sidekick, User } from 'types'

export async function upsertChat({
    id,
    user,
    filters = {},
    prompt,
    journeyId,
    sidekick,
    chatflowChatId
}: {
    id?: string
    user: User

    filters?: object
    prompt: string
    journeyId?: string
    chatflowChatId: string
    sidekick: Sidekick
}) {
    // const journey = await (!journeyId
    //   ? null
    //   : prisma.journey.update({
    //       where: { id: journeyId },
    //       data: { filters, users: { connect: { email: user.email! } } }
    //     }));

    const chatProperties = {
        title: prompt,
        chatflowChatId,
        users: {
            connect: {
                email: user.email!
            }
        },
        filters: filters
        // ...(journey ? { journeyId: journey.id } : null)
        // organization: { connect: { id: user.organizationId! } }
        // messages: {
        //   create: {
        //     role: 'user',
        //     content: prompt,
        //     sidekickJson: sidekick as any,
        //     user: { connect: { email: user.email! } }
        //   }
        // }
    }

    let chat
    if (!user.organizationId) throw new Error('')
    if (!id) {
        chat = await prisma.chat.create({
            data: {
                ...chatProperties,
                owner: { connect: { id: user.id } },
                organization: { connect: { id: user.organizationId } }
            }
            // include: { journey: true }
        })
    } else {
        chat = await prisma.chat.update({
            where: { id },

            data: chatProperties

            // include: { journey: true }
        })
    }
    return chat as Chat
}
