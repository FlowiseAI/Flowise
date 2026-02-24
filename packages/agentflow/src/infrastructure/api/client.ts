import axios, { AxiosInstance } from 'axios'

/**
 * Creates a configured axios client for API calls
 * @param apiBaseUrl - Base URL of the Flowise server
 * @param token - Authentication token (optional)
 */
export function createApiClient(apiBaseUrl: string, token?: string): AxiosInstance {
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

    // Add request interceptor for debugging
    client.interceptors.request.use(
        (config) => {
            return config
        },
        (error) => Promise.reject(error)
    )

    // Add response interceptor for error handling
    client.interceptors.response.use(
        (response) => response,
        (error) => {
            if (error.response?.status === 401) {
                console.error('[Agentflow] 401 Authentication error:', {
                    url: error.config?.url,
                    message: error.response?.data?.message || error.message,
                    hasToken: !!token,
                    tokenLength: token?.length
                })
            }
            return Promise.reject(error)
        }
    )

    return client
}

export type { AxiosInstance }
