import React from 'react'
import { prisma } from '@db/client'
import { getAppSettings } from '@ui/getAppSettings'
import JourneyForm from '@ui/JourneyForm'
import getCachedSession from '@ui/getCachedSession'

export const metadata = {
    title: 'Journey | Answer Agent',
    description: 'Your journey'
}

const JourneyEditPage = async ({ params }: any) => {
    const appSettings = await getAppSettings()
    const session = await getCachedSession()

    const journeyPromise = prisma.journey
        .findUnique({
            where: {
                id: params.journeyId
            },
            include: { chats: { include: { prompt: true, messages: { include: { user: true } } } } }
        })
        .then((data: any) => JSON.parse(JSON.stringify(data)))

    const [journey] = await Promise.all([journeyPromise])

    return <JourneyForm {...params} user={session?.user!} appSettings={appSettings} journey={journey} />
}

export default JourneyEditPage
