import axios, { AxiosResponse, AxiosRequestHeaders } from 'axios'

interface SpiderAppConfig {
    apiKey?: string | null
    apiUrl?: string | null
}

interface SpiderDocumentMetadata {
    title?: string
    description?: string
    language?: string
    [key: string]: any
}

interface SpiderDocument {
    id?: string
    url?: string
    content: string
    markdown?: string
    html?: string
    createdAt?: Date
    updatedAt?: Date
    type?: string
    metadata: SpiderDocumentMetadata
}

interface ScrapeResponse {
    success: boolean
    data?: SpiderDocument
    error?: string
}

interface CrawlResponse {
    success: boolean
    data?: SpiderDocument[]
    error?: string
}

interface Params {
    [key: string]: any
}

class SpiderApp {
    private apiKey: string
    private apiUrl: string

    constructor({ apiKey = null, apiUrl = null }: SpiderAppConfig) {
        this.apiKey = apiKey || ''
        this.apiUrl = apiUrl || 'https://api.spider.cloud/v1'
        if (!this.apiKey) {
            throw new Error('No API key provided')
        }
    }

    async scrapeUrl(url: string, params: Params | null = null): Promise<ScrapeResponse> {
        const headers = this.prepareHeaders()
        const jsonData: Params = { url, limit: 1, ...params }

        try {
            const response: AxiosResponse = await this.postRequest('crawl', jsonData, headers)
            if (response.status === 200) {
                const responseData = response.data
                if (responseData[0].status) {
                    return { success: true, data: responseData[0] }
                } else {
                    throw new Error(`Failed to scrape URL. Error: ${responseData.error}`)
                }
            } else {
                this.handleError(response, 'scrape URL')
            }
        } catch (error: any) {
            throw new Error(error.message)
        }
        return { success: false, error: 'Internal server error.' }
    }

    async crawlUrl(url: string, params: Params | null = null, idempotencyKey?: string): Promise<CrawlResponse | any> {
        const headers = this.prepareHeaders(idempotencyKey)
        const jsonData: Params = { url, ...params }

        try {
            const response: AxiosResponse = await this.postRequest('crawl', jsonData, headers)
            if (response.status === 200) {
                return { success: true, data: response.data }
            } else {
                this.handleError(response, 'start crawl job')
            }
        } catch (error: any) {
            throw new Error(error.message)
        }
        return { success: false, error: 'Internal server error.' }
    }

    private prepareHeaders(idempotencyKey?: string): AxiosRequestHeaders {
        return {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${this.apiKey}`,
            ...(idempotencyKey ? { 'x-idempotency-key': idempotencyKey } : {})
        } as AxiosRequestHeaders & { 'x-idempotency-key'?: string }
    }

    private postRequest(url: string, data: Params, headers: AxiosRequestHeaders): Promise<AxiosResponse> {
        return axios.post(`${this.apiUrl}/${url}`, data, { headers })
    }

    private handleError(response: AxiosResponse, action: string): void {
        if ([402, 408, 409, 500].includes(response.status)) {
            const errorMessage: string = response.data.error || 'Unknown error occurred'
            throw new Error(`Failed to ${action}. Status code: ${response.status}. Error: ${errorMessage}`)
        } else {
            throw new Error(`Unexpected error occurred while trying to ${action}. Status code: ${response.status}`)
        }
    }
}

export default SpiderApp
