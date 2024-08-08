import React from 'react'

import { prisma } from '@db/client'
import SidekickFormLayout from './SidekickFormLayout.Client'
import getCachedSession from '../getCachedSession'

export default async function ChatUILayout({
    // This will be populated with nested layouts or pages
    sidekickId,
    children
}: {
    children: React.ReactNode
    sidekickId: string
}) {
    const session = await getCachedSession()

    if (!session?.user?.email) return null

    const sidekicksPromise = prisma.sidekick
        .findMany({
            where: {
                createdByUser: {
                    email: session.user.email
                }
            },
            orderBy: {
                updatedAt: 'desc'
            }
        })
        .then((data: any) => JSON.parse(JSON.stringify(data)))

    const [sidekicks] = await Promise.all([sidekicksPromise])

    return (
        <SidekickFormLayout sidekicks={sidekicks} appSettings={session.user.appSettings}>
            {children}
        </SidekickFormLayout>
    )
}
