import { NextResponse } from 'next/server'
import getCachedSession from '@ui/getCachedSession'
import { postFlowiseFeedback } from '@utils/flowiseFeedback'

import auth0 from '@utils/auth/auth0'

export async function POST(req: Request): Promise<NextResponse<any>> {
    const session = await getCachedSession()

    if (!session?.user?.email) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { accessToken } = await auth0.getAccessToken({
        authorizationParams: { organization: session.user.organizationId }
    })
    if (!accessToken) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await req.json()

    const result = await postFlowiseFeedback({ ...body, accessToken })

    return NextResponse.json({ result })
}
