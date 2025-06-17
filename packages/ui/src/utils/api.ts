const baseUrl = process.env.NEXT_PUBLIC_USE_PROXY === 'true' ? '/api/flowise' : 'https://flowise-ai-cqlx.onrender.com/api/v1'

export async function api<T>(endpoint: string, opts: RequestInit = {}, retries = 1) {
    const url = `${baseUrl}/${endpoint.replace(/^\/+/, '')}`
    const headers = {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        ...(opts.headers || {})
    }
    try {
        const res = await fetch(url, {
            ...opts,
            headers,
            credentials: 'include'
        })
        if (!res.ok) {
            const text = await res.text().catch(() => '')
            if (retries > 0) {
                return api<T>(endpoint, opts, retries - 1)
            }
            throw new Error(`HTTP ${res.status} – ${text || res.statusText}`)
        }
        try {
            return (await res.json()) as T
        } catch (e) {
            const text = await res.text().catch(() => '')
            return text as any
        }
    } catch (err) {
        if (retries > 0) {
            return api<T>(endpoint, opts, retries - 1)
        }
        throw err
    }
}
