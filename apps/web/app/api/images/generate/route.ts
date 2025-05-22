import { NextResponse } from 'next/server'
import getCachedSession from '@ui/getCachedSession'

export async function POST(req: Request) {
    const session = await getCachedSession()
    if (!session?.user?.email) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const apiKey = process.env.AAI_DEFAULT_OPENAI_API_KEY
    if (!apiKey) {
        return NextResponse.json({ error: 'OpenAI key not configured' }, { status: 500 })
    }

    const res = await fetch('https://api.openai.com/v1/images/generations', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${apiKey}`
        },
        body: JSON.stringify(body)
    })

    if (!res.ok) {
        const text = await res.text()
        return NextResponse.json({ error: text }, { status: res.status })
    }

    const data = await res.json()
    return NextResponse.json(data)
}
