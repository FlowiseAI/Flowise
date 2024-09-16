// import type { NextApiRequest, NextApiResponse } from 'next';
import { NextResponse } from 'next/server'
import getCachedSession from '@ui/getCachedSession'
import { prisma } from '@db/client'

export async function GET(req: Request) {
    const user = await getCachedSession()
    if (!user?.user?.email) return NextResponse.redirect('/auth')
    const records = await prisma.chat.findMany({
        where: {
            users: {
                some: {
                    email: user?.user?.email
                }
            },
            organization: { id: user?.user?.organizationId! },
            chatflowChatId: { not: null },
            journeyId: null
        }
    })
    return NextResponse.json(records)
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
