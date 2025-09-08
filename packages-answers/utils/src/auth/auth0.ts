// utils/auth0.js
import { initAuth0 } from '@auth0/nextjs-auth0'

// Debug logging helper with safety
const debugLog = (message: string, data?: any) => {
    if (process.env.AUTH0_DEBUG === 'true' || process.env.DEBUG === 'true') {
        let dataStr = ''
        if (data) {
            try {
                dataStr = JSON.stringify(data, null, 2)
            } catch {
                dataStr = String(data)
            }
        }
        console.log('🔐 AUTH0 DEBUG:', message, dataStr)
    }
}

const getBaseUrl = () => {
    let baseURL
    debugLog('Determining base URL...')

    if (process.env.VERCEL_PREVIEW_URL) {
        baseURL = `https://${process.env.VERCEL_PREVIEW_URL}`
        debugLog('Using VERCEL_PREVIEW_URL', { baseURL })
    }
    if (process.env.VERCEL_URL) {
        baseURL = `https://${process.env.VERCEL_URL}`
        debugLog('Using VERCEL_URL', { baseURL })
    }
    if (process.env.AUTH0_BASE_URL) {
        baseURL = process.env.AUTH0_BASE_URL
        debugLog('Using AUTH0_BASE_URL', { baseURL })
    }

    if (baseURL) {
        debugLog('Final base URL determined', { baseURL })
        return baseURL
    }

    const error = 'No valid baseURL found. Set either VERCEL_PREVIEW_URL, VERCEL_URL, or AUTH0_BASE_URL environment variable.'
    debugLog('ERROR: Base URL determination failed', { error })
    throw new Error(error)
}
const domain = process.env.AUTH0_BASE_URL?.replace('https://', '')?.replace('http://', '')?.split(':')[0]?.split('.')?.slice(-2)?.join('.')

// Log Auth0 configuration for debugging
const baseURL = getBaseUrl()
const authConfig = {
    secret: process.env.AUTH0_SECRET ? '[REDACTED]' : 'MISSING',
    issuerBaseURL: process.env.AUTH0_ISSUER_BASE_URL,
    baseURL,
    clientID: process.env.AUTH0_CLIENT_ID,
    clientSecret: process.env.AUTH0_CLIENT_SECRET ? '[REDACTED]' : 'MISSING',
    idTokenSigningAlg: process.env.AUTH0_TOKEN_SIGN_ALG ?? 'RS256',
    audience: process.env.AUTH0_AUDIENCE ?? 'https://theanswer.ai',
    domain,
    organizationId: process.env.AUTH0_ORGANIZATION_ID
}

debugLog('Initializing Auth0 with config', authConfig)

export default initAuth0({
    secret: process.env.AUTH0_SECRET,
    issuerBaseURL: process.env.AUTH0_ISSUER_BASE_URL,
    baseURL: baseURL,
    clientID: process.env.AUTH0_CLIENT_ID,
    clientSecret: process.env.AUTH0_CLIENT_SECRET,
    idTokenSigningAlg: process.env.AUTH0_TOKEN_SIGN_ALG ?? 'RS256',
    authorizationParams: {
        response_type: 'code',
        scope: 'openid profile email',
        audience: process.env.AUTH0_AUDIENCE ?? 'https://theanswer.ai'
    },
    session: {
        cookie: {
            domain: domain
        }
    },
    routes: {
        callback: '/api/auth/callback',
        postLogoutRedirect: '/'
    }
})
