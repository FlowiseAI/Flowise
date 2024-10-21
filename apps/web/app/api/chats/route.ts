// import type { NextApiRequest, NextApiResponse } from 'next';
import { NextResponse } from 'next/server'
import getCachedSession from '@ui/getCachedSession'
import { prisma } from '@db/client'

import type { Chat } from 'types'

export async function GET(req: Request): Promise<NextResponse<Chat[]>> {
    const session = await getCachedSession()

    if (!session?.user?.email) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const chats = await prisma.chat.findMany({
        where: {
            users: { some: { email: session.user.email } },
            organizationId: session.user.organizationId
        }
    })

    return NextResponse.json(chats)
}

export async function DELETE(req: Request) {
    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')

    const user = await getCachedSession()
    if (!user?.user?.email) return NextResponse.redirect('/auth')
    if (id) {
        const userRecord = await prisma.chat.findFirst({
            where: {
                id,
                users: { some: { email: user?.user?.email } }
            }
        })

        if (!userRecord) return NextResponse.redirect('/auth')
        await prisma.chat.delete({
            where: {
                id
            }
        })
        return NextResponse.json({ id })
    }
}
