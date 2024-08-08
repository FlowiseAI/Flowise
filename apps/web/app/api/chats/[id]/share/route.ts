// import type { NextApiRequest, NextApiResponse } from 'next';
import { NextResponse } from 'next/server'
import getCachedSession from '@ui/getCachedSession'
import { prisma } from '@db/client'

export async function POST(req: Request) {
    try {
        const session = await getCachedSession()
        const user = session?.user
        if (!user?.email) return NextResponse.json({ error: 'You must be logged in to share a chat' }, { status: 403 })
        const { chatId, email } = await req.json()

        if (!email?.length) {
            return NextResponse.json({ error: 'You must provide at least one email' }, { status: 403 })
        }
        let chat = await prisma.chat.findUnique({
            where: { id: chatId }
        })

        if (!chat || chat.ownerId !== user.id) {
            NextResponse.json({ error: 'You are not the owner of this chat' }, { status: 403 })
        }

        await prisma.user.createMany({
            data: email.map((email: string) => ({
                email
            })),
            skipDuplicates: true
        })

        chat = await prisma.chat.update({
            where: { id: chatId },
            data: {
                users: {
                    set: email.map((email: string) => ({
                        email
                    }))
                }
            },
            include: { users: true }
        })
        return NextResponse.json({ success: true })
    } catch (error) {
        console.log('[PATCH] error', error)
        throw error
    }
}
