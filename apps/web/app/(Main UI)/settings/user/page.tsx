import React from 'react'
import { prisma } from '@db/client'
import UserProfile from '@ui/UserProfile/UserProfile'
import getCachedSession from '@ui/getCachedSession'

export const metadata = {
    title: 'User Settings | Answer Agent',
    description: 'User Settings'
}

const UserFormPage = async ({ params }: any) => {
    const session = await getCachedSession()

    if (!session?.user?.email) return null

    // Only returns the fields we'll be editing
    const user = await prisma.user
        .findFirst({
            where: {
                id: session.user.id
            },
            select: { id: true, contextFields: true }
        })
        .then((data: any) => JSON.parse(JSON.stringify(data)))

    return <UserProfile {...params} user={user} />
}

export default UserFormPage
