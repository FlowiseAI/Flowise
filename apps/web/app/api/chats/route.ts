import { NextResponse } from 'next/server'
import getCachedSession from '@ui/getCachedSession'
import { prisma } from '@db/client'
import { getChats } from '@utils/getChats'

import type { Chat } from 'types'

export async function GET(req: Request): Promise<NextResponse<Chat[]>> {
    const session = await getCachedSession()

    if (!session?.user?.email) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const mergedChats = await getChats(session.user)
    return NextResponse.json(mergedChats)
}

export async function DELETE(req: Request) {
    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')

    const session = await getCachedSession()
    if (!session?.user?.email) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (id) {
        const userRecord = await prisma.chat.findFirst({
            where: {
                id,
                users: { some: { email: session.user.email } }
            }
        })

        if (!userRecord) {
            return NextResponse.json({ error: 'Not found' }, { status: 404 })
        }

        await prisma.chat.delete({
            where: { id }
        })
        return NextResponse.json({ id })
    }

    return NextResponse.json({ error: 'Missing id' }, { status: 400 })
}
