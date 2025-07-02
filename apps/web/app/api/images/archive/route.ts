/*
 * This route has been deprecated in favor of calling the Flowise archive endpoint directly from the client.
 * See: ImageCreator.Client.tsx fetchArchivedImages function
 */

import { NextResponse } from 'next/server'
import getCachedSession from '@ui/getCachedSession'
import auth0 from '@utils/auth/auth0'

export async function GET(req: Request) {
    const session = await getCachedSession()
    if (!session?.user?.email) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Use org_id from Auth0 if organizationId is not properly set (same as generate API)
    const organizationId = session.user.organizationId || session.user.org_id

    // console.log('Archive API - Session user data:', {
    //     id: session.user.id,
    //     organizationId: session.user.organizationId,
    //     org_id: session.user.org_id,
    //     finalOrganizationId: organizationId,
    //     email: session.user.email,
    //     chatflowDomain: session.user.chatflowDomain
    // })

    // Get user's access token for Flowise authentication
    const { accessToken } = await auth0.getAccessToken({
        authorizationParams: { organization: organizationId }
    })
    if (!accessToken) {
        return NextResponse.json({ error: 'Failed to get access token' }, { status: 500 })
    }

    try {
        // Parse query parameters for pagination
        const url = new URL(req.url)
        const page = url.searchParams.get('page') || '1'
        const limit = url.searchParams.get('limit') || '20'

        // Use the same domain resolution as chat flow and generate API
        const flowiseDomain =
            session.user.chatflowDomain || process.env.CHATFLOW_DOMAIN_OVERRIDE || process.env.DOMAIN || 'http://localhost:4000'
        // console.log('Archive API - Using Flowise domain:', flowiseDomain)

        const response = await fetch(`${flowiseDomain}/api/v1/dalle-image/archive?page=${page}&limit=${limit}`, {
            method: 'GET',
            headers: {
                Authorization: `Bearer ${accessToken}`
            }
        })

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
