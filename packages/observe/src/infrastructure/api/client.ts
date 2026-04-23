import axios, { type AxiosInstance } from 'axios'

import type { RequestInterceptor } from '@/core/types'

/**
 * Creates a configured axios instance for @flowiseai/observe API calls.
 * All internal SDK calls (executions list, get by id, delete) use this client.
 * The HITL prediction call is intentionally NOT made here — it is delegated to
 * the consumer via the onHumanInput prop so routing can differ between OSS and DevSite.
 *
 * @param apiBaseUrl - Base URL of the Flowise server
 * @param token - Optional API key — sets Authorization: Bearer header when provided
 * @param requestInterceptor - Optional callback to customize outgoing requests.
 *   Runs after the Bearer header is set, so it can extend or override auth headers.
 */
export function bindApiClient(apiBaseUrl: string, token?: string, requestInterceptor?: RequestInterceptor): AxiosInstance {
    const headers: Record<string, string> = {
        'Content-Type': 'application/json'
    }

    if (token) {
        headers['Authorization'] = `Bearer ${token}`
    }

    const client = axios.create({
        baseURL: `${apiBaseUrl}/api/v1`,
        headers
    })

    client.interceptors.request.use(
        (config) => {
            if (!requestInterceptor) return config
            try {
                return requestInterceptor(config)
            } catch (error) {
                console.error('[Observe] requestInterceptor threw:', error)
                return config
            }
        },
        (error) => Promise.reject(error)
    )

    client.interceptors.response.use(
        (response) => response,
        (error) => {
            if (error.response?.status === 401) {
                console.error('[Observe] 401 Authentication error:', {
                    url: error.config?.url,
                    message: error.response?.data?.message || error.message,
                    hasToken: !!token,
                    hasInterceptor: !!requestInterceptor
                })
            }
            return Promise.reject(error)
        }
    )

    return client
}
