import { NextResponse } from 'next/server'

/**
 * Simple ping endpoint like flowise - just returns "pong"
 * No auth, no redirects, no middleware interference
 */
export async function GET() {
    return new NextResponse('pong', {
        status: 200,
        headers: { 'Content-Type': 'text/plain' }
    })
}

export async function HEAD() {
    return new NextResponse(null, { status: 200 })
}
