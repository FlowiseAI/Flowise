export const config = {
    matcher: [
        '/((?!api/codebase|api/ai/chat-completion|api/inngest|api/sidekicks/new|api/sidekicks/*|_next/static|_next/image|favicon.ico|!api/auth/*).*)'
    ]
}
// middleware.js
import {
    initAuth0 // note the edge runtime specific `initAuth0`
} from '@auth0/nextjs-auth0/edge'
import { NextResponse } from 'next/server'

const auth0 = initAuth0({
    secret: process.env.AUTH0_SECRET,
    issuerBaseURL: process.env.AUTH0_ISSUER_BASE_URL,
    baseURL: process.env.AUTH0_BASE_URL,
    clientID: process.env.AUTH0_CLIENT_ID,
    clientSecret: process.env.AUTH0_CLIENT_SECRET,
    idTokenSigningAlg: process.env.AUTH0_TOKEN_SIGN_ALG
})

export default async function middleware(req) {
    const res = NextResponse.next()
    // const user = await auth0.getSession(req, res);
    // res.cookies.set('hl', user?.language);
    return res
}
