import { TextSplitter } from 'langchain/text_splitter'
import { Document, DocumentInterface } from '@langchain/core/documents'
import { BaseDocumentLoader } from 'langchain/document_loaders/base'
import { INode, INodeData, INodeParams, ICommonObject, INodeOutputsValue } from '../../../src/Interface'
import { getCredentialData, getCredentialParam, handleEscapeCharacters } from '../../../src/utils'
import axios, { AxiosResponse, AxiosRequestHeaders } from 'axios'
import { z } from 'zod'

// FirecrawlApp interfaces
interface FirecrawlAppConfig {
    apiKey?: string | null
    apiUrl?: string | null
}

interface FirecrawlDocumentMetadata {
    title?: string
    description?: string
    language?: string
    sourceURL?: string
    statusCode?: number
    error?: string
    [key: string]: any
}

interface FirecrawlDocument {
    markdown?: string
    html?: string
    rawHtml?: string
    screenshot?: string
    links?: string[]
    actions?: {
        screenshots?: string[]
    }
    metadata: FirecrawlDocumentMetadata
    llm_extraction?: Record<string, any>
    warning?: string
}

interface ScrapeResponse {
    success: boolean
    data?: FirecrawlDocument
    error?: string
}

interface CrawlResponse {
    success: boolean
    id: string
    url: string
    error?: string
    data?: FirecrawlDocument
}

interface CrawlStatusResponse {
    status: string
    total: number
    completed: number
    creditsUsed: number
    expiresAt: string
    next?: string
    data?: FirecrawlDocument[]
}

interface ExtractResponse {
    success: boolean
    id: string
    url: string
    data?: Record<string, any>
}

interface Params {
    [key: string]: any
    extractorOptions?: {
        extractionSchema: z.ZodSchema | any
        mode?: 'llm-extraction'
        extractionPrompt?: string
    }
}

type Format = 'markdown' | 'html' | 'rawHtml' | 'links' | 'screenshot' | 'screenshot@fullPage' | 'json'

interface ExtractRequest {
    urls: string[]
    prompt?: string
    schema?: Record<string, any>
    enableWebSearch?: boolean
    ignoreSitemap?: boolean
    includeSubdomains?: boolean
    showSources?: boolean
    scrapeOptions?: {
        formats?: string[]
        onlyMainContent?: boolean
        includeTags?: string | string[]
        excludeTags?: string | string[]
        mobile?: boolean
        skipTlsVerification?: boolean
        timeout?: number
        jsonOptions?: {
            schema?: Record<string, any>
            prompt?: string
        }
    }
}

interface ExtractStatusResponse {
    success: boolean
    data: any
    status: 'completed' | 'pending' | 'processing' | 'failed' | 'cancelled'
    expiresAt: string
}

// FirecrawlApp class (not exported)
class FirecrawlApp {
    private apiKey: string
    private apiUrl: string

    constructor({ apiKey = null, apiUrl = null }: FirecrawlAppConfig) {
        this.apiKey = apiKey || ''
        this.apiUrl = apiUrl || 'https://api.firecrawl.dev'
        if (!this.apiKey) {
            throw new Error('No API key provided')
        }
    }

    async scrapeUrl(url: string, params: Params | null = null): Promise<ScrapeResponse> {
        const headers = this.prepareHeaders()

        // Create a clean payload with only valid parameters
        const validParams: any = {
            url,
            formats: ['markdown'],
            onlyMainContent: true
        }

        // Add optional parameters if they exist
        if (params?.scrapeOptions) {
            if (params.scrapeOptions.includeTags) {
                validParams.includeTags = Array.isArray(params.scrapeOptions.includeTags)
                    ? params.scrapeOptions.includeTags
                    : params.scrapeOptions.includeTags.split(',')
            }
            if (params.scrapeOptions.excludeTags) {
                validParams.excludeTags = Array.isArray(params.scrapeOptions.excludeTags)
                    ? params.scrapeOptions.excludeTags
                    : params.scrapeOptions.excludeTags.split(',')
            }
            if (params.scrapeOptions.mobile !== undefined) {
                validParams.mobile = params.scrapeOptions.mobile
            }
            if (params.scrapeOptions.skipTlsVerification !== undefined) {
                validParams.skipTlsVerification = params.scrapeOptions.skipTlsVerification
            }
            if (params.scrapeOptions.timeout) {
                validParams.timeout = params.scrapeOptions.timeout
            }
        }

        // Add JSON options if they exist
        if (params?.extractorOptions) {
            validParams.jsonOptions = {
                schema: params.extractorOptions.extractionSchema,
                prompt: params.extractorOptions.extractionPrompt
            }
        }

        try {
            if (process.env.DEBUG === 'true') console.log('Firecrawl: Scraping URL with params:', { url, params: validParams })
            const response: AxiosResponse = await this.postRequest(this.apiUrl + '/v1/scrape', validParams, headers)
            if (response.status === 200) {
                const responseData = response.data
                if (responseData.success) {
                    if (process.env.DEBUG === 'true') console.log('Firecrawl: Scrape successful')
                    return responseData
                } else {
                    if (process.env.DEBUG === 'true') console.error('Firecrawl: Scrape failed with error:', responseData.error)
                    throw new Error(`Failed to scrape URL. Error: ${responseData.error}`)
                }
            } else {
                if (process.env.DEBUG === 'true')
                    console.error(
                        'Firecrawl: Scrape failed with status:',
                        response.status,
                        'Response:',
                        JSON.stringify(response.data, null, 2)
                    )
                this.handleError(response, 'scrape URL')
            }
        } catch (error: any) {
            if (process.env.DEBUG === 'true')
                console.error('Firecrawl: Scrape error:', error.message, 'Response:', JSON.stringify(error.response?.data, null, 2))
            throw new Error(error.message)
        }
        return { success: false, error: 'Internal server error.' }
    }

    async crawlUrl(
        url: string,
        params: Params | null = null,
        waitUntilDone: boolean = true,
        pollInterval: number = 2,
        idempotencyKey?: string
    ): Promise<CrawlResponse | CrawlStatusResponse> {
        const headers = this.prepareHeaders(idempotencyKey)

        // Create a clean payload with only valid parameters
        const validParams: any = {
            url
        }

        // Add scrape options with only non-empty values
        const scrapeOptions: any = {
            formats: ['markdown'],
            onlyMainContent: true
        }

        // Add crawl-specific parameters if they exist and are not empty
        if (params) {
            const validCrawlParams = [
                'excludePaths',
                'includePaths',
                'maxDepth',
                'maxDiscoveryDepth',
                'ignoreSitemap',
                'ignoreQueryParameters',
                'limit',
                'allowBackwardLinks',
                'allowExternalLinks',
                'delay'
            ]

            validCrawlParams.forEach((param) => {
                if (params[param] !== undefined && params[param] !== null && params[param] !== '') {
                    validParams[param] = params[param]
                }
            })
        }

        // Add scrape options if they exist and are not empty
        if (params?.scrapeOptions) {
            if (params.scrapeOptions.includeTags) {
                const includeTags = Array.isArray(params.scrapeOptions.includeTags)
                    ? params.scrapeOptions.includeTags
                    : params.scrapeOptions.includeTags.split(',')
                if (includeTags.length > 0) {
                    scrapeOptions.includeTags = includeTags
                }
            }

            if (params.scrapeOptions.excludeTags) {
                const excludeTags = Array.isArray(params.scrapeOptions.excludeTags)
                    ? params.scrapeOptions.excludeTags
                    : params.scrapeOptions.excludeTags.split(',')
                if (excludeTags.length > 0) {
                    scrapeOptions.excludeTags = excludeTags
                }
            }

            const validScrapeParams = ['mobile', 'skipTlsVerification', 'timeout']

            validScrapeParams.forEach((param) => {
                if (params.scrapeOptions[param] !== undefined && params.scrapeOptions[param] !== null) {
                    scrapeOptions[param] = params.scrapeOptions[param]
                }
            })
        }

        // Add JSON options if they exist and are not empty
        if (params?.extractorOptions?.extractionSchema || params?.extractorOptions?.extractionPrompt) {
            scrapeOptions.jsonOptions = {}
            if (params.extractorOptions.extractionSchema) {
                scrapeOptions.jsonOptions.schema = params.extractorOptions.extractionSchema
            }
            if (params.extractorOptions.extractionPrompt) {
                scrapeOptions.jsonOptions.prompt = params.extractorOptions.extractionPrompt
            }
        }

        // Only add scrapeOptions if it has more than just the default values
        if (Object.keys(scrapeOptions).length > 2) {
            validParams.scrapeOptions = scrapeOptions
        }

        try {
            if (process.env.DEBUG === 'true') console.log('Firecrawl: Crawling URL with params:', { url, params: validParams })
            const response: AxiosResponse = await this.postRequest(this.apiUrl + '/v1/crawl', validParams, headers)
            if (response.status === 200) {
                const crawlResponse = response.data as CrawlResponse
                if (!crawlResponse.success) {
                    if (process.env.DEBUG === 'true') console.error('Firecrawl: Crawl request failed:', crawlResponse.error)
                    throw new Error(`Crawl request failed: ${crawlResponse.error || 'Unknown error'}`)
                }

                if (waitUntilDone) {
                    if (process.env.DEBUG === 'true') console.log('Firecrawl: Waiting for crawl job to complete')
                    return this.monitorJobStatus(crawlResponse.id, headers, pollInterval)
                } else {
                    if (process.env.DEBUG === 'true') console.log('Firecrawl: Crawl job started successfully')
                    return crawlResponse
                }
            } else {
                if (process.env.DEBUG === 'true')
                    console.error(
                        'Firecrawl: Crawl failed with status:',
                        response.status,
                        'Response:',
                        JSON.stringify(response.data, null, 2)
                    )
                this.handleError(response, 'start crawl job')
            }
        } catch (error: any) {
            if (process.env.DEBUG === 'true')
                console.error('Firecrawl: Crawl error:', error.message, 'Response:', JSON.stringify(error.response?.data, null, 2))
            if (error.response?.data?.error) {
                throw new Error(`Crawl failed: ${error.response.data.error}`)
            }
            throw new Error(`Crawl failed: ${error.message}`)
        }

        return { success: false, id: '', url: '' }
    }

    async extract(
        request: ExtractRequest,
        waitUntilDone: boolean = true,
        pollInterval: number = 2
    ): Promise<ExtractResponse | ExtractStatusResponse> {
        const headers = this.prepareHeaders()

        // Create a clean payload with only valid parameters
        const validParams: any = {
            urls: request.urls
        }

        // Add optional parameters if they exist and are not empty
        if (request.prompt) {
            validParams.prompt = request.prompt
        }

        if (request.schema) {
            validParams.schema = request.schema
        }

        const validExtractParams = ['enableWebSearch', 'ignoreSitemap', 'includeSubdomains', 'showSources'] as const

        validExtractParams.forEach((param) => {
            if (request[param] !== undefined && request[param] !== null) {
                validParams[param] = request[param]
            }
        })

        // Add scrape options if they exist
        if (request.scrapeOptions) {
            const scrapeOptions: any = {
                formats: ['markdown'],
                onlyMainContent: true
            }

            // Handle includeTags
            if (request.scrapeOptions.includeTags) {
                const includeTags = Array.isArray(request.scrapeOptions.includeTags)
                    ? request.scrapeOptions.includeTags
                    : request.scrapeOptions.includeTags.split(',')
                if (includeTags.length > 0) {
                    scrapeOptions.includeTags = includeTags
                }
            }

            // Handle excludeTags
            if (request.scrapeOptions.excludeTags) {
                const excludeTags = Array.isArray(request.scrapeOptions.excludeTags)
                    ? request.scrapeOptions.excludeTags
                    : request.scrapeOptions.excludeTags.split(',')
                if (excludeTags.length > 0) {
                    scrapeOptions.excludeTags = excludeTags
                }
            }

            // Add other scrape options if they exist and are not empty
            const validScrapeParams = ['mobile', 'skipTlsVerification', 'timeout'] as const

            validScrapeParams.forEach((param) => {
                if (request.scrapeOptions?.[param] !== undefined && request.scrapeOptions?.[param] !== null) {
                    scrapeOptions[param] = request.scrapeOptions[param]
                }
            })

            // Add JSON options if they exist
            if (request.scrapeOptions.jsonOptions) {
                scrapeOptions.jsonOptions = {}
                if (request.scrapeOptions.jsonOptions.schema) {
                    scrapeOptions.jsonOptions.schema = request.scrapeOptions.jsonOptions.schema
                }
                if (request.scrapeOptions.jsonOptions.prompt) {
                    scrapeOptions.jsonOptions.prompt = request.scrapeOptions.jsonOptions.prompt
                }
            }

            // Only add scrapeOptions if it has more than just the default values
            if (Object.keys(scrapeOptions).length > 2) {
                validParams.scrapeOptions = scrapeOptions
            }
        }

        try {
            if (process.env.DEBUG === 'true') console.log('Firecrawl: Extracting with params:', validParams)
            const response: AxiosResponse = await this.postRequest(this.apiUrl + '/v1/extract', validParams, headers)
            if (response.status === 200) {
                const extractResponse = response.data as ExtractResponse
                if (waitUntilDone) {
                    return this.monitorExtractStatus(extractResponse.id, headers, pollInterval)
                } else {
                    return extractResponse
                }
            } else {
                if (process.env.DEBUG === 'true')
                    console.error(
                        'Firecrawl: Extract failed with status:',
                        response.status,
                        'Response:',
                        JSON.stringify(response.data, null, 2)
                    )
                this.handleError(response, 'start extract job')
            }
        } catch (error: any) {
            if (process.env.DEBUG === 'true')
                console.error('Firecrawl: Extract error:', error.message, 'Response:', JSON.stringify(error.response?.data, null, 2))
            throw new Error(error.message)
        }
        return { success: false, id: '', url: '' }
    }

    async getExtractStatus(jobId: string): Promise<ExtractStatusResponse> {
        const headers = this.prepareHeaders()
        try {
            const response: AxiosResponse = await this.getRequest(this.apiUrl + `/v1/extract/${jobId}`, headers)
            if (response.status === 200) {
                return response.data as ExtractStatusResponse
            } else {
                this.handleError(response, 'get extract status')
            }
        } catch (error: any) {
            throw new Error(error.message)
        }
        return { success: false, data: null, status: 'failed', expiresAt: '' }
    }

    private prepareHeaders(idempotencyKey?: string): AxiosRequestHeaders {
        return {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${this.apiKey}`,
            'X-Origin': 'flowise',
            'X-Origin-Type': 'integration',
            ...(idempotencyKey ? { 'x-idempotency-key': idempotencyKey } : {})
        } as AxiosRequestHeaders & { 'X-Origin': string; 'X-Origin-Type': string; 'x-idempotency-key'?: string }
    }

    private postRequest(url: string, data: Params, headers: AxiosRequestHeaders): Promise<AxiosResponse> {
        return axios.post(url, data, { headers })
    }

    private getRequest(url: string, headers: AxiosRequestHeaders): Promise<AxiosResponse> {
        return axios.get(url, { headers })
    }

    private async monitorJobStatus(jobId: string, headers: AxiosRequestHeaders, checkInterval: number): Promise<CrawlStatusResponse> {
        let isJobCompleted = false
        while (!isJobCompleted) {
            if (process.env.DEBUG === 'true') console.log('Firecrawl: Checking job status for ID:', jobId)
            const statusResponse: AxiosResponse = await this.getRequest(this.apiUrl + `/v1/crawl/${jobId}`, headers)
            if (statusResponse.status === 200) {
                const statusData = statusResponse.data as CrawlStatusResponse
                if (process.env.DEBUG === 'true') console.log('Firecrawl: Job status:', statusData.status)
                switch (statusData.status) {
                    case 'completed':
                        isJobCompleted = true
                        if (process.env.DEBUG === 'true') console.log('Firecrawl: Job completed successfully')
                        return statusData
                    case 'scraping':
                    case 'failed':
                        if (statusData.status === 'failed') {
                            if (process.env.DEBUG === 'true') console.error('Firecrawl: Job failed')
                            throw new Error('Crawl job failed')
                        }
                        await new Promise((resolve) => setTimeout(resolve, Math.max(checkInterval, 2) * 1000))
                        break
                    default:
                        if (process.env.DEBUG === 'true') console.error('Firecrawl: Unknown job status:', statusData.status)
                        throw new Error(`Unknown crawl status: ${statusData.status}`)
                }
            } else {
                if (process.env.DEBUG === 'true')
                    console.error(
                        'Firecrawl: Status check failed with status:',
                        statusResponse.status,
                        'Response:',
                        JSON.stringify(statusResponse.data, null, 2)
                    )
                this.handleError(statusResponse, 'check crawl status')
            }
        }
        throw new Error('Failed to monitor job status')
    }

    private async monitorExtractStatus(jobId: string, headers: AxiosRequestHeaders, checkInterval: number): Promise<ExtractStatusResponse> {
        let isJobCompleted = false
        while (!isJobCompleted) {
            const statusResponse: AxiosResponse = await this.getRequest(this.apiUrl + `/v1/extract/${jobId}`, headers)
            if (statusResponse.status === 200) {
                const statusData = statusResponse.data as ExtractStatusResponse
                switch (statusData.status) {
                    case 'completed':
                        isJobCompleted = true
                        return statusData
                    case 'processing':
                    case 'failed':
                        if (statusData.status === 'failed') {
                            throw new Error('Extract job failed')
                        }
                        await new Promise((resolve) => setTimeout(resolve, Math.max(checkInterval, 2) * 1000))
                        break
                    default:
                        throw new Error(`Unknown extract status: ${statusData.status}`)
                }
            } else {
                this.handleError(statusResponse, 'check extract status')
            }
        }
        throw new Error('Failed to monitor extract status')
    }

    private handleError(response: AxiosResponse, action: string): void {
        if ([402, 408, 409, 500].includes(response.status)) {
            const errorMessage: string = response.data.error || 'Unknown error occurred'
            if (process.env.DEBUG === 'true')
                console.error('Firecrawl: API error:', {
                    status: response.status,
                    action,
                    error: errorMessage,
                    response: response.data
                })
            throw new Error(`Failed to ${action}. Status code: ${response.status}. Error: ${errorMessage}`)
        } else {
            if (process.env.DEBUG === 'true')
                console.error('Firecrawl: Unexpected error:', {
                    status: response.status,
                    action,
                    response: response.data
                })
            throw new Error(`Unexpected error occurred while trying to ${action}. Status code: ${response.status}`)
        }
    }
}

// FireCrawl Loader
interface FirecrawlLoaderParameters {
    url: string
    apiKey?: string
    apiUrl?: string
    mode?: 'crawl' | 'scrape' | 'extract' | 'getExtractStatus'
    params?: Record<string, unknown>
}

export class FireCrawlLoader extends BaseDocumentLoader {
    private apiKey: string
    private apiUrl: string
    private url: string
    private mode: 'crawl' | 'scrape' | 'extract' | 'getExtractStatus'
    private params?: Record<string, unknown>

    constructor(loaderParams: FirecrawlLoaderParameters) {
        super()
        const { apiKey, apiUrl, url, mode = 'crawl', params } = loaderParams
        if (!apiKey) {
            throw new Error('Firecrawl API key not set. You can set it as FIRECRAWL_API_KEY in your .env file, or pass it to Firecrawl.')
        }

        this.apiKey = apiKey
        this.url = url
        this.mode = mode
        this.params = params
        this.apiUrl = apiUrl || 'https://api.firecrawl.dev'
    }

    public async load(): Promise<DocumentInterface[]> {
        const app = new FirecrawlApp({ apiKey: this.apiKey, apiUrl: this.apiUrl })
        let firecrawlDocs: FirecrawlDocument[]

        if (process.env.DEBUG === 'true') console.log('Firecrawl: Starting load with mode:', this.mode)

        if (this.mode === 'scrape') {
            if (process.env.DEBUG === 'true') console.log('Firecrawl: Scraping URL:', this.url)
            const response = await app.scrapeUrl(this.url, this.params)
            if (!response.success) {
                if (process.env.DEBUG === 'true') console.error('Firecrawl: Scrape failed:', response.error)
                throw new Error(`Firecrawl: Failed to scrape URL. Error: ${response.error}`)
            }
            firecrawlDocs = [response.data as FirecrawlDocument]
        } else if (this.mode === 'crawl') {
            if (process.env.DEBUG === 'true') console.log('Firecrawl: Crawling URL:', this.url)
            const response = await app.crawlUrl(this.url, {
                ...this.params,
                scrapeOptions: {
                    ...(this.params?.scrapeOptions || {}),
                    onlyMainContent: true
                }
            })

            if ('status' in response) {
                // This is a CrawlStatusResponse
                if (response.status === 'failed') {
                    if (process.env.DEBUG === 'true') console.error('Firecrawl: Crawl job failed')
                    throw new Error('Firecrawl: Crawl job failed')
                }
                firecrawlDocs = response.data || []
            } else {
                // This is a CrawlResponse
                if (!response.success) {
                    if (process.env.DEBUG === 'true') console.error('Firecrawl: Crawl failed:', response.error)
                    throw new Error(`Firecrawl: Failed to scrape URL. Error: ${response.error}`)
                }
                firecrawlDocs = [response.data as FirecrawlDocument]
            }
        } else if (this.mode === 'extract') {
            if (process.env.DEBUG === 'true') console.log('Firecrawl: Extracting from URL:', this.url)
            this.params!.urls = [this.url]
            const response = await app.extract(this.params as any as ExtractRequest)
            if (!response.success) {
                if (process.env.DEBUG === 'true') console.error('Firecrawl: Extract failed')
                throw new Error(`Firecrawl: Failed to extract URL.`)
            }

            // Convert extract response to document format
            if ('data' in response && response.data) {
                // Create a document from the extracted data
                const extractedData = response.data
                const content = JSON.stringify(extractedData, null, 2)

                const metadata: Record<string, any> = {
                    source: this.url,
                    type: 'extracted_data'
                }

                // Add status and expiresAt if they exist in the response
                if ('status' in response) {
                    metadata.status = response.status
                }
                if ('data' in response) {
                    metadata.data = response.data
                }
                if ('expiresAt' in response) {
                    metadata.expiresAt = response.expiresAt
                }

                return [
                    new Document({
                        pageContent: content,
                        metadata
                    })
                ]
            }
            return []
        } else if (this.mode === 'getExtractStatus') {
            const jobId = this.params?.jobId as string
            if (process.env.DEBUG === 'true') console.log('Firecrawl: Getting extract status for job:', jobId)
            const response = await app.getExtractStatus(jobId)
            if (!response.success) {
                if (process.env.DEBUG === 'true') console.error('Firecrawl: Get extract status failed')
                throw new Error(`Firecrawl: Failed to get extract status.`)
            }

            // Convert extract status response to document format
            if ('data' in response && response.data) {
                const content = JSON.stringify(response.data, null, 2)
                return [
                    new Document({
                        pageContent: content,
                        metadata: {
                            type: 'extract_status',
                            status: response.status,
                            expiresAt: response.expiresAt
                        }
                    })
                ]
            }
            return []
        } else {
            if (process.env.DEBUG === 'true') console.error('Firecrawl: Invalid mode:', this.mode)
            throw new Error(`Unrecognized mode '${this.mode}'. Expected one of 'crawl', 'scrape', 'extract'.`)
        }

        if (process.env.DEBUG === 'true') console.log('Firecrawl: Converting documents, count:', firecrawlDocs.length)

        // Convert Firecrawl documents to LangChain documents
        const documents = firecrawlDocs.map((doc) => {
            // Use markdown content if available, otherwise fallback to HTML or empty string
            const content = doc.markdown || doc.html || doc.rawHtml || ''

            if (process.env.DEBUG === 'true') console.log('Firecrawl: Document metadata:', doc.metadata)

            // Create a standard LangChain document
            return new Document({
                pageContent: content,
                metadata: {
                    ...doc.metadata,
                    source: doc.metadata?.sourceURL || this.url,
                    title: doc.metadata?.title,
                    description: doc.metadata?.description,
                    language: doc.metadata?.language,
                    statusCode: doc.metadata?.statusCode
                }
            })
        })

        if (process.env.DEBUG === 'true') console.log('Firecrawl: Load completed, returning documents:', documents.length)
        return documents
    }
}

// Flowise Node Class
class FireCrawl_DocumentLoaders implements INode {
    label: string
    name: string
    description: string
    type: string
    icon: string
    version: number
    category: string
    baseClasses: string[]
    inputs: INodeParams[]
    credential: INodeParams
    outputs: INodeOutputsValue[]

    constructor() {
        this.label = 'FireCrawl'
        this.name = 'fireCrawl'
        this.type = 'Document'
        this.icon = 'firecrawl.png'
        this.version = 2.1
        this.category = 'Document Loaders'
        this.description = 'Load data from URL using FireCrawl'
        this.baseClasses = [this.type]
        this.credential = {
            label: 'FireCrawl API',
            name: 'credential',
            type: 'credential',
            credentialNames: ['fireCrawlApi']
        }
        this.inputs = [
            {
                label: 'Text Splitter',
                name: 'textSplitter',
                type: 'TextSplitter',
                optional: true
            },
            {
                label: 'URLs',
                name: 'url',
                type: 'string',
                description: 'URL to be crawled/scraped/extracted',
                placeholder: 'https://docs.flowiseai.com'
            },
            {
                label: 'Crawler type',
                type: 'options',
                name: 'crawlerType',
                options: [
                    {
                        label: 'Crawl',
                        name: 'crawl',
                        description: 'Crawl a URL and all accessible subpages'
                    },
                    {
                        label: 'Scrape',
                        name: 'scrape',
                        description: 'Scrape a URL and get its content'
                    },
                    {
                        label: 'Extract',
                        name: 'extract',
                        description: 'Extract data from a URL'
                    },
                    {
                        label: 'Get extract status (DATA)',
                        name: 'getExtractStatus',
                        description: 'Get the status of an extract job'
                    }
                ],
                default: 'crawl'
            },
            {
                // includeTags
                label: '[Scrape] Include Tags',
                name: 'includeTags',
                type: 'string',
                description: 'Tags to include in the output',
                optional: true,
                additionalParams: true
            },
            {
                // excludeTags
                label: '[Scrape] Exclude Tags',
                name: 'excludeTags',
                type: 'string',
                description: 'Tags to exclude from the output',
                optional: true,
                additionalParams: true
            },
            {
                // onlyMainContent
                label: '[Scrape] Only Main Content',
                name: 'onlyMainContent',
                type: 'boolean',
                description: 'Extract only the main content of the page',
                optional: true,
                additionalParams: true
            },
            {
                // limit
                label: '[Crawl] Limit',
                name: 'limit',
                type: 'string',
                description: 'Maximum number of pages to crawl',
                optional: true,
                additionalParams: true,
                default: '10000'
            },
            {
                label: '[Extract] Schema',
                name: 'extractSchema',
                type: 'json',
                description: 'JSON schema for data extraction',
                optional: true,
                additionalParams: true
            },
            {
                label: '[Extract] Prompt',
                name: 'extractPrompt',
                type: 'string',
                description: 'Prompt for data extraction',
                optional: true,
                additionalParams: true
            },
            {
                label: '[Extract] Job ID',
                name: 'extractJobId',
                type: 'string',
                description: 'ID of the extract job',
                optional: true,
                additionalParams: true
            }
        ]
        this.outputs = [
            {
                label: 'Document',
                name: 'document',
                description: 'Array of document objects containing metadata and pageContent',
                baseClasses: [...this.baseClasses, 'json']
            },
            {
                label: 'Text',
                name: 'text',
                description: 'Concatenated string from pageContent of documents',
                baseClasses: ['string', 'json']
            }
        ]
    }

    async init(nodeData: INodeData, _: string, options: ICommonObject): Promise<any> {
        const textSplitter = nodeData.inputs?.textSplitter as TextSplitter
        const metadata = nodeData.inputs?.metadata
        const url = nodeData.inputs?.url as string
        const crawlerType = nodeData.inputs?.crawlerType as string
        const limit = nodeData.inputs?.limit as string
        const onlyMainContent = nodeData.inputs?.onlyMainContent as boolean
        const credentialData = await getCredentialData(nodeData.credential ?? '', options)
        const firecrawlApiToken = getCredentialParam('firecrawlApiToken', credentialData, nodeData)
        const firecrawlApiUrl = getCredentialParam('firecrawlApiUrl', credentialData, nodeData, 'https://api.firecrawl.dev')
        const output = nodeData.outputs?.output as string

        const urlPatternsExcludes = nodeData.inputs?.urlPatternsExcludes
            ? (nodeData.inputs.urlPatternsExcludes.split(',') as string[])
            : undefined
        const urlPatternsIncludes = nodeData.inputs?.urlPatternsIncludes
            ? (nodeData.inputs.urlPatternsIncludes.split(',') as string[])
            : undefined

        const extractSchema = nodeData.inputs?.extractSchema
        const extractPrompt = nodeData.inputs?.extractPrompt as string

        const input: FirecrawlLoaderParameters = {
            url,
            mode: crawlerType as 'crawl' | 'scrape' | 'extract' | 'getExtractStatus',
            apiKey: firecrawlApiToken,
            apiUrl: firecrawlApiUrl,
            params: {
                scrapeOptions: {
                    includePaths: urlPatternsIncludes,
                    excludePaths: urlPatternsExcludes,
                    limit: limit ? parseFloat(limit) : 1000,
                    onlyMainContent,
                    includeTags: nodeData.inputs?.includeTags,
                    excludeTags: nodeData.inputs?.excludeTags
                },
                schema: extractSchema ?? undefined,
                prompt: extractPrompt ?? undefined
            }
        }

        try {
            const loader = new FireCrawlLoader(input)
            let docs = []

            // Load documents
            docs = await loader.load()

            // Apply text splitting if configured
            if (textSplitter && docs.length > 0) {
                docs = await textSplitter.splitDocuments(docs)
            }

            // Apply metadata if provided
            if (metadata) {
                const parsedMetadata = typeof metadata === 'object' ? metadata : JSON.parse(metadata)
                docs = docs.map((doc) => ({
                    ...doc,
                    metadata: {
                        ...doc.metadata,
                        ...parsedMetadata
                    }
                }))
            }

            // Return based on output type
            if (output === 'document') {
                return docs
            } else {
                let finaltext = ''
                for (const doc of docs) {
                    finaltext += `${doc.pageContent}\n`
                }
                return handleEscapeCharacters(finaltext, false)
            }
        } catch (error) {
            if (process.env.DEBUG === 'true') {
                options.logger.error(`Error in FireCrawl loader: ${error.message}`)
            }
            throw error
        }
    }
}

module.exports = { nodeClass: FireCrawl_DocumentLoaders }

// FOR TESTING PURPOSES
// export { FireCrawl_DocumentLoaders }
