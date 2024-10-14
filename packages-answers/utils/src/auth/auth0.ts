// utils/auth0.js
import { initAuth0 } from '@auth0/nextjs-auth0'

const getBaseUrl = () => {
    if (process.env.VERCEL_PREVIEW_URL) {
        return `https://${process.env.VERCEL_PREVIEW_URL}`
    }
    if (process.env.VERCEL_URL) {
        return `https://${process.env.VERCEL_URL}`
    }
    if (process.env.AUTH0_BASE_URL) {
        return process.env.AUTH0_BASE_URL
    }
    throw new Error('No valid baseURL found. Set either VERCEL_PREVIEW_URL, VERCEL_URL, or AUTH0_BASE_URL environment variable.')
}

export default initAuth0({
    secret: process.env.AUTH0_SECRET,
    issuerBaseURL: process.env.AUTH0_ISSUER_BASE_URL,
    baseURL: getBaseUrl(),
    clientID: process.env.AUTH0_CLIENT_ID,
    clientSecret: process.env.AUTH0_CLIENT_SECRET,
    idTokenSigningAlg: process.env.AUTH0_TOKEN_SIGN_ALG,
    routes: {
        callback: '/api/auth/callback',
        postLogoutRedirect: '/'
    }
})
