import { NextResponse } from 'next/server'
import getCachedSession from '@ui/getCachedSession'
import { findSidekicksForChat } from '@utils/findSidekicksForChat'
import { respond401 } from '@utils/auth/respond401'
import type { Chatflow } from 'types'

interface SidekickListResponse {
    sidekicks: Array<SidekickSummary>
    categories: { top: string[]; more: string[] }
}

interface SidekickSummary {
    id: string
    label: string
    chatflow: Chatflow
    isExecutable: boolean
}

export async function GET(req: Request) {
    const session = await getCachedSession()
    const { searchParams } = new URL(req.url)
    const lightweight = searchParams.get('lightweight') !== 'false' // Default to true

    const user = session?.user
    if (!session?.user?.email) return respond401()
    try {
        const data = await findSidekicksForChat(user, { lightweight })
        const sidekicksWithCloneInfo: SidekickSummary[] = data.sidekicks.map((sidekick) => ({
            ...sidekick,
            isExecutable: true
        }))

        const response: SidekickListResponse = {
            sidekicks: sidekicksWithCloneInfo,
            categories: data.categories
        }

        return NextResponse.json(response)
    } catch (error) {
        if (error instanceof Error && error.message === 'Unauthorized') {
            return respond401()
        }
        console.error('Error fetching sidekicks:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
