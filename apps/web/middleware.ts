import { NextRequest, NextResponse } from 'next/server'
import { withMiddlewareAuthRequired } from '@auth0/nextjs-auth0/edge'

// const allowedOrigins = ['https://localhost:3210'] // TODO: lock this down
const allowedOrigins = ['*']

const corsOptions = {
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization'
}

export const middleware = withMiddlewareAuthRequired(function middleware(request: NextRequest) {
    // Check the origin from the request
    const origin = request.headers.get('origin') ?? ''
    const isAllowedOrigin = allowedOrigins.includes(origin) || allowedOrigins.includes('*')

    // Handle preflighted requests
    const isPreflight = request.method === 'OPTIONS'

    if (isPreflight) {
        const preflightHeaders = {
            ...(isAllowedOrigin && { 'Access-Control-Allow-Origin': origin }),
            ...corsOptions
        }
        return NextResponse.json({}, { headers: preflightHeaders })
    }

    // Handle simple requests
    const response = NextResponse.next()

    if (isAllowedOrigin) {
        response.headers.set('Access-Control-Allow-Origin', origin)
    }

    Object.entries(corsOptions).forEach(([key, value]) => {
        response.headers.set(key, value)
    })

    return response
})

export const config = {
    matcher: '/api/:path*'
}
