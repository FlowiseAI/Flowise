import getCachedSession from '@ui/getCachedSession'

import { prisma } from '@db/client'

import HomepageClient from './Homepage.Client'

const HomepageServer = async () => {
    const session = await getCachedSession()
    if (!session?.user) {
        return null
    }

    const journeysPromise = prisma.journey
        .findMany({
            where: {
                users: {
                    some: {
                        id: session.user.id
                    }
                },
                completedAt: null
            },
            orderBy: {
                updatedAt: 'desc'
            },
            select: {
                id: true,
                title: true,
                goal: true,
                updatedAt: true,
                _count: {
                    select: { chats: true }
                }
            }
        })
        .then((data: any) => JSON.parse(JSON.stringify(data)))

    const journeys = await journeysPromise

    return <HomepageClient user={session.user} journeys={journeys} appSettings={session.user.appSettings} />
}

export default HomepageServer
