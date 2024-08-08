// import type { NextApiRequest, NextApiResponse } from 'next';
import { NextResponse } from 'next/server'
import getCachedSession from '@ui/getCachedSession'
import { prisma } from '@db/client'

import type { Chat } from 'types'

export async function GET(req: Request, { params }: { params: { id: string } }): Promise<NextResponse<Chat>> {
    const user = await getCachedSession()
    const id = params.id

    const [record] = await prisma.chat.findMany({
        where: {
            id,
            users: { some: { email: user?.user?.email } }
        },
        include: {
            journey: { select: { id: true, title: true } },
            users: { select: { id: true, name: true, email: true } },
            prompt: true,
            messages: {
                include: {
                    user: { select: { id: true, email: true, image: true, name: true } },
                    contextDocuments: true
                },
                orderBy: {
                    createdAt: 'asc'
                }
            }
        }
    })
    return NextResponse.json(record as any)
}
