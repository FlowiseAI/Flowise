// Types für HTTP Methoden und Optionen
type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH'

interface RequestOptions {
    headers?: Record<string, string>
    params?: Record<string, string>
    timeout?: number
}

export interface KCenterRetrieverClientConfig {
    baseUrl: string
    defaultHeaders?: Record<string, string>
    timeout?: number
}

// Error Klasse für HTTP Fehler
export class HttpError extends Error {
    constructor(public status: number, public statusText: string, public data: any) {
        super(`HTTP Error: ${status} ${statusText}`)
        this.name = 'HttpError'
    }
}

// Der eigentliche HTTP Client
export class KCenterRetrieverClient {
    private baseUrl: string
    private defaultHeaders: Record<string, string>
    private defaultTimeout: number

    constructor(config: KCenterRetrieverClientConfig) {
        this.baseUrl = config.baseUrl.replace(/\/$/, '')
        this.defaultHeaders = {
            'Content-Type': 'application/json',
            ...config.defaultHeaders
        }
        this.defaultTimeout = config.timeout || 10000
    }

    // Generic Methode für alle HTTP Requests
    private async request<T>(method: HttpMethod, endpoint: string, data?: any, options: RequestOptions = {}): Promise<T> {
        const url = new URL(`${this.baseUrl}${endpoint}`)

        // Query Parameter hinzufügen
        if (options.params) {
            Object.entries(options.params).forEach(([key, value]) => {
                url.searchParams.append(key, value)
            })
        }

        try {
            const response = await fetch(url.toString(), {
                method,
                headers: {
                    ...this.defaultHeaders,
                    ...options.headers
                },
                body: data ? JSON.stringify(data) : undefined,
                signal: AbortSignal.timeout(options.timeout || this.defaultTimeout)
            })

            if (!response.ok) {
                throw new HttpError(response.status, response.statusText, await response.json().catch(() => null))
            }

            // Prüfen ob Response vorhanden ist
            const contentType = response.headers.get('content-type')
            if (contentType?.includes('application/json')) {
                return response.json()
            }
            return response.text() as unknown as T
        } catch (error) {
            if (error instanceof HttpError) {
                throw error
            }
            throw new Error(`Network error: ${error.message}`)
        }
    }

    // Convenience Methoden für die verschiedenen HTTP Methoden
    public async get<T>(endpoint: string, options?: RequestOptions): Promise<T> {
        return this.request<T>('GET', endpoint, undefined, options)
    }

    public async post<T>(endpoint: string, data?: any, options?: RequestOptions): Promise<T> {
        return this.request<T>('POST', endpoint, data, options)
    }

    public async put<T>(endpoint: string, data?: any, options?: RequestOptions): Promise<T> {
        return this.request<T>('PUT', endpoint, data, options)
    }

    public async delete<T>(endpoint: string, options?: RequestOptions): Promise<T> {
        return this.request<T>('DELETE', endpoint, undefined, options)
    }

    public async patch<T>(endpoint: string, data?: any, options?: RequestOptions): Promise<T> {
        return this.request<T>('PATCH', endpoint, data, options)
    }
}
