// import type { NextApiRequest, NextApiResponse } from 'next';
import { NextResponse } from 'next/server'
import getCachedSession from '@ui/getCachedSession'
import { prisma } from '@db/client'
import { respond401 } from '@utils/auth/respond401'
import crypto from 'crypto'

export async function POST(req: Request) {
    try {
        const session = await getCachedSession(req)
        if (!session?.user?.email) return respond401()
        const { user } = session
        const apiKey = await prisma.apiKey.create({
            data: {
                userId: user.id,
                key: crypto.randomUUID(),
                type: 'USER'
            }
        })
        return NextResponse.json({
            apiKey
        })
    } catch (error) {
        console.error('Failed to create ApiKey:', error)
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}
