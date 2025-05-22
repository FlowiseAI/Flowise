import React from 'react'
import { prisma } from '@db/client'
import Chat from '@ui/Chat'
import getCachedSession from '@ui/getCachedSession'

export const metadata = {
    title: 'Journey | Answer Agent',
    description: 'Your journey'
}

const JourneyDetailPage = async ({ params }: any) => {
    const session = await getCachedSession()

    const journeyPromise = prisma.journey
        .findUnique({
            where: {
                id: params.journeyId
            },
            include: { chats: { include: { prompt: true, messages: { include: { user: true } } } } }
        })
        .then((data: any) => JSON.parse(JSON.stringify(data)))

    const sidekicksPromise = prisma.sidekick.findMany({
        where: {
            OR: [
                // {
                //   favoritedBy: {
                //     some: {
                //       id: session?.user?.id!
                //     }
                //   }
                // },
                {
                    isSystem: true
                }
            ]
        }
    })
    const [journey, sidekicks] = await Promise.all([journeyPromise, sidekicksPromise])
    // @ts-expect-error Async Server Component
    return <Chat {...params} journey={journey} sidekicks={sidekicks} />
}

export default JourneyDetailPage
