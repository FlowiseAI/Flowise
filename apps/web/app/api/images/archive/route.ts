import { NextResponse } from 'next/server'
import getCachedSession from '@ui/getCachedSession'
import auth0 from '@utils/auth/auth0'

export async function GET(req: Request) {
    const session = await getCachedSession()
    if (!session?.user?.email) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user's access token for Flowise authentication
    const { accessToken } = await auth0.getAccessToken({
        authorizationParams: { organization: session.user.organizationId }
    })
    if (!accessToken) {
        return NextResponse.json({ error: 'Failed to get access token' }, { status: 500 })
    }

    try {
        // Parse query parameters for pagination
        const url = new URL(req.url)
        const page = url.searchParams.get('page') || '1'
        const limit = url.searchParams.get('limit') || '20'

        // Call Flowise server API to get archived images
        const flowiseDomain = process.env.DOMAIN || 'http://localhost:4000'
        const response = await fetch(
            `${flowiseDomain}/api/v1/upload-dalle-image/archive?organizationId=${session.user.organizationId}&userId=${session.user.id}&page=${page}&limit=${limit}`,
            {
                method: 'GET',
                headers: {
                    Authorization: `Bearer ${accessToken}`
                }
            }
        )

        if (!response.ok) {
            console.error('Failed to fetch archived images')
            return NextResponse.json({ error: 'Failed to fetch archived images' }, { status: response.status })
        }

        const data = await response.json()
        return NextResponse.json(data)
    } catch (error) {
        console.error('Archive fetch error:', error)
        return NextResponse.json(
            {
                error: 'Failed to fetch archived images'
            },
            { status: 500 }
        )
    }
}
