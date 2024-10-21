import { NextResponse } from 'next/server'
import getCachedSession from '@ui/getCachedSession'
import { findSidekicksForChat } from '@utils/findSidekicksForChat'
import { respond401 } from '@utils/auth/respond401'

export async function GET(req: Request) {
    const session = await getCachedSession()

    const user = session?.user
    if (!session?.user?.email) return respond401()
    try {
        const sidekicks = await findSidekicksForChat(user)
        // Use the requiresClone field from the chatbotConfig
        const sidekicksWithCloneInfo = sidekicks.sidekicks.map((sidekick: any) => {
            const chatbotConfig = JSON.parse(sidekick.chatflow.chatbotConfig || '{}')
            return {
                ...sidekick,
                isExecutable:
                    sidekick.chatflow.isPublic ||
                    sidekick.chatflow.userId === user.id ||
                    (sidekick.chatflow.visibility?.includes('Organization') && sidekick.chatflow.organizationId === user.organizationId),
                requiresClone: chatbotConfig.requiresClone || !sidekick.chatflow.isPublic
            }
        })
        console.log({ sidekicks: sidekicksWithCloneInfo })
        return NextResponse.json({ ...sidekicks, sidekicks: sidekicksWithCloneInfo })
    } catch (error) {
        return respond401()
    }
}
