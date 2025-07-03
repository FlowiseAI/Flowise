import { NextResponse } from 'next/server'
import getCachedSession from '@ui/getCachedSession'
import { findSidekickById } from '@utils/findSidekickById'
import { respond401 } from '@utils/auth/respond401'
import type { Chatflow } from 'types'

interface SidekickApiResponse {
    id: string
    label: string
    chatflow: Chatflow
    chatbotConfig?: any
    flowData?: any
    isExecutable: boolean
}

export async function GET(req: Request, { params }: { params: { id: string } }) {
    const session = await getCachedSession()
    const user = session?.user

    if (!session?.user?.email) return respond401()

    try {
        const sidekick = await findSidekickById(user, params.id)

        if (!sidekick) {
            return NextResponse.json({ error: 'Sidekick not found' }, { status: 404 })
        }

        const response: SidekickApiResponse = {
            ...sidekick,
            isExecutable: true
        }

        return NextResponse.json(response)
    } catch (error) {
        console.error('Error fetching sidekick details:', error)
        if (error instanceof Error && error.message === 'Unauthorized') {
            return respond401()
        }
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
