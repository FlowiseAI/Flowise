import { NextResponse } from 'next/server'
import getCachedSession from '@ui/getCachedSession'
import auth0 from '@utils/auth/auth0'

export async function POST(req: Request) {
    const session = await getCachedSession()
    if (!session?.user?.email) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Use org_id from Auth0 if organizationId is not properly set
    const organizationId = session.user.organizationId || session.user.org_id

    // console.log('Generate API - Session user data:', {
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
        const body = await req.json()

        // Add user context to the request body for the Flowise server
        const requestBody = {
            ...body,
            organizationId,
            userId: session.user.id,
            userEmail: session.user.email
        }

        // Use the same domain resolution as chat flow - user's chatflowDomain or fallback
        const flowiseDomain =
            session.user.chatflowDomain || process.env.CHATFLOW_DOMAIN_OVERRIDE || process.env.DOMAIN || 'http://localhost:4000'
        // console.log('Using Flowise domain:', flowiseDomain)

        const response = await fetch(`${flowiseDomain}/api/v1/dalle-image/generate`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${accessToken}`
            },
            body: JSON.stringify(requestBody)
        })

        if (!response.ok) {
            const errorData = await response.json()
            console.error('Flowise API Error:', errorData)
            return NextResponse.json(errorData, { status: response.status })
        }

        const data = await response.json()
        return NextResponse.json(data)
    } catch (error) {
        console.error('Proxy error:', error)
        return NextResponse.json({ error: 'Failed to generate image' }, { status: 500 })
    }
}
