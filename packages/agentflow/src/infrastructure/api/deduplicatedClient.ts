import type { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios'

/** Default TTL for cached responses (30 seconds) */
const DEFAULT_CACHE_TTL_MS = 30_000

interface CacheEntry {
    response: AxiosResponse
    expiresAt: number
}

/**
 * Build a cache key from request method, URL, and optional data/params.
 */
function buildCacheKey(method: string, url: string, data?: unknown): string {
    const parts = [method.toUpperCase(), url]
    if (data != null) {
        parts.push(JSON.stringify(data))
    }
    return parts.join('::')
}

/**
 * Determine whether a request is safe to deduplicate/cache.
 * Only idempotent read operations are eligible:
 * - All GET requests
 * - POST to /node-load-method/* (idempotent listing operations)
 */
function isCacheable(method: string, url: string): boolean {
    if (method === 'get') return true
    if (method === 'post' && url.startsWith('/node-load-method/')) return true
    return false
}

/**
 * Wrap an axios instance with in-flight request deduplication and a short TTL cache.
 *
 * For cacheable requests (GETs and POST /node-load-method/*):
 * 1. If a cached response exists and hasn't expired, return it immediately.
 * 2. If an identical request is already in-flight, share the existing promise.
 * 3. Otherwise, make the request, cache the response, and return it.
 *
 * Errors are never cached — only successful responses are stored.
 * Non-cacheable requests (mutations, non-load-method POSTs) always pass through.
 */
export interface DeduplicatedClient extends AxiosInstance {
    /** Clear all cached responses. Call after mutations that invalidate metadata. */
    clearCache(): void
}

export function withDeduplication(client: AxiosInstance, cacheTtlMs: number = DEFAULT_CACHE_TTL_MS): DeduplicatedClient {
    const inFlight = new Map<string, Promise<AxiosResponse>>()
    // No size limit needed: ~15 distinct metadata endpoints with 30s TTL keeps this trivially small
    const cache = new Map<string, CacheEntry>()

    function getCached(key: string): AxiosResponse | undefined {
        const entry = cache.get(key)
        if (!entry) return undefined
        if (Date.now() > entry.expiresAt) {
            cache.delete(key)
            return undefined
        }
        return entry.response
    }

    function deduplicatedGet<T = unknown, R = AxiosResponse<T>, D = unknown>(url: string, config?: AxiosRequestConfig<D>): Promise<R> {
        const key = buildCacheKey('get', url, config?.params)

        const cached = getCached(key)
        if (cached) return Promise.resolve(cached as R)

        const existing = inFlight.get(key)
        if (existing) return existing as Promise<R>

        const promise = client
            .get<T, R, D>(url, config)
            .then((response) => {
                cache.set(key, { response: response as AxiosResponse, expiresAt: Date.now() + cacheTtlMs })
                return response
            })
            .finally(() => inFlight.delete(key))

        inFlight.set(key, promise as Promise<AxiosResponse>)
        return promise
    }

    function deduplicatedPost<T = unknown, R = AxiosResponse<T>, D = unknown>(
        url: string,
        data?: D,
        config?: AxiosRequestConfig<D>
    ): Promise<R> {
        if (!isCacheable('post', url)) {
            return client.post<T, R, D>(url, data, config)
        }

        const key = buildCacheKey('post', url, data)

        const cached = getCached(key)
        if (cached) return Promise.resolve(cached as R)

        const existing = inFlight.get(key)
        if (existing) return existing as Promise<R>

        const promise = client
            .post<T, R, D>(url, data, config)
            .then((response) => {
                cache.set(key, { response: response as AxiosResponse, expiresAt: Date.now() + cacheTtlMs })
                return response
            })
            .finally(() => inFlight.delete(key))

        inFlight.set(key, promise as Promise<AxiosResponse>)
        return promise
    }

    // Use Object.create so put, delete, interceptors, defaults, etc.
    // all fall through to the original client via the prototype chain.
    return Object.assign(Object.create(client) as AxiosInstance, {
        get: deduplicatedGet,
        post: deduplicatedPost,
        clearCache() {
            cache.clear()
        }
    }) as DeduplicatedClient
}
