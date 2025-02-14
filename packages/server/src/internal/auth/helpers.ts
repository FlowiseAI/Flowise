import dotenv from 'dotenv'
dotenv.config()

export const getAccessTokenForGraph = async (refreshToken: string) => {
    const tokenUrl = `https://login.microsoftonline.com/${process.env.CRM_TENANT_ID}/oauth2/v2.0/token`
    const scope = 'https://graph.microsoft.com/.default'

    const body = new URLSearchParams({
        client_id: process.env.CRM_CLIENT_ID || '',
        scope,
        client_secret: process.env.CRM_CLIENT_SECRET || '',
        grant_type: 'refresh_token',
        refresh_token: refreshToken || ''
    })

    const response: Response = await fetch(tokenUrl, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
        },
        body
    })
    const accessToken = (await response.json()).access_token
    return accessToken
}

export const getAuth0Token = async (code: string, redirectUri: string) => {
    try {
        const response = await fetch(`https://${process.env.AUTH0_ISSUER_BASE_URL}/oauth/token`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                grant_type: 'authorization_code',
                client_id: process.env.AUTH0_CLIENT_ID,
                client_secret: process.env.AUTH0_CLIENT_SECRET,
                code,
                redirect_uri: redirectUri
            })
        })
        if (!response.ok) {
            throw new Error('Failed to get auth0 access token')
        }
        const data: Record<string, string> = await response.json()
        return data.access_token
    } catch (error) {
        console.error('Error getting auth0 access token:', error)
        return ''
    }
}

export const getAuth0UserInfo = async (accessToken: string) => {
    const response = await fetch(`https://${process.env.AUTH0_ISSUER_BASE_URL}/userinfo`, {
        headers: {
            Authorization: `Bearer ${accessToken}`
        }
    })
    if (!response.ok) {
        throw new Error('Failed to get auth0 user info')
    }
    const data: Record<string, string> = await response.json()
    return data
}
