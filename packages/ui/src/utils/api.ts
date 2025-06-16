const baseUrl =
  process.env.NEXT_PUBLIC_USE_PROXY === 'true'
    ? '/api/flowise'
    : 'https://flowise-ai-cqlx.onrender.com/api/v1'

export async function api<T>(endpoint: string, opts: RequestInit = {}) {
  const url = `${baseUrl}/${endpoint.replace(/^\/+/, '')}`
  const res = await fetch(url, { ...opts, credentials: 'include' })
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`HTTP ${res.status} – ${text || res.statusText}`)
  }
  return res.json() as Promise<T>
}
