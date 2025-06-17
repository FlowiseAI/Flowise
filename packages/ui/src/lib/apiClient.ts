export interface FetchOptions extends RequestInit {
    timeout?: number
    retries?: number
}

export async function apiFetch<T>(url: string, options: FetchOptions = {}): Promise<T> {
    const { timeout = 10000, retries = 3, ...init } = options
    const controller = new AbortController()
    const id = setTimeout(() => controller.abort(), timeout)
    try {
        const res = await fetch(url, { ...init, signal: controller.signal })
        const text = await res.text()
        let data: any
        try {
            data = JSON.parse(text)
        } catch {
            data = text
        }
        if (!res.ok) {
            if (res.status === 502 && retries > 0) {
                return apiFetch(url, { ...options, retries: retries - 1 })
            }
            throw { response: res, data }
        }
        return data
    } catch (err: any) {
        if (err.name === 'AbortError') {
            throw new Error('Request timeout')
        }
        throw err
    } finally {
        clearTimeout(id)
    }
}
