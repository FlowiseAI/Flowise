import { TextSplitter } from 'langchain/text_splitter'
import { Document, DocumentInterface } from '@langchain/core/documents'
import { BaseDocumentLoader } from 'langchain/document_loaders/base'
import { INode, INodeData, INodeParams, ICommonObject, INodeOutputsValue } from '../../../src/Interface'
import { getCredentialData, getCredentialParam, handleEscapeCharacters } from '../../../src/utils'
import axios, { AxiosResponse, AxiosRequestHeaders } from 'axios'
import { z } from 'zod'
import { zodToJsonSchema } from 'zod-to-json-schema'

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
        formats: Format[]
        onlyMainContent?: boolean
        includeTags?: string[]
        excludeTags?: string[]
        mobile?: boolean
        skipTlsVerification?: boolean
        timeout?: number
        [key: string]: any
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
        let jsonData: Params = { url, ...params }
        if (params?.extractorOptions?.extractionSchema) {
            let schema = params.extractorOptions.extractionSchema
            if (schema instanceof z.ZodSchema) {
                schema = zodToJsonSchema(schema)
            }
            jsonData = {
                ...jsonData,
                extractorOptions: {
                    ...params.extractorOptions,
                    extractionSchema: schema,
                    mode: params.extractorOptions.mode || 'llm-extraction'
                }
            }
        }
        try {
            const response: AxiosResponse = await this.postRequest(this.apiUrl + '/v1/scrape', jsonData, headers)
            if (response.status === 200) {
                const responseData = response.data
                if (responseData.success) {
                    return responseData
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

    async crawlUrl(
        url: string,
        params: Params | null = null,
        waitUntilDone: boolean = true,
        pollInterval: number = 2,
        idempotencyKey?: string
    ): Promise<CrawlResponse | CrawlStatusResponse> {
        const headers = this.prepareHeaders(idempotencyKey)
        let jsonData: Params = { url, ...params }
        try {
            const response: AxiosResponse = await this.postRequest(this.apiUrl + '/v1/crawl', jsonData, headers)
            if (response.status === 200) {
                const crawlResponse = response.data as CrawlResponse
                if (!crawlResponse.success) {
                    throw new Error(`Crawl request failed: ${crawlResponse.error || 'Unknown error'}`)
                }

                if (waitUntilDone) {
                    return this.monitorJobStatus(crawlResponse.id, headers, pollInterval)
                } else {
                    return crawlResponse
                }
            } else {
                this.handleError(response, 'start crawl job')
            }
        } catch (error: any) {
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
        try {
            const response: AxiosResponse = await this.postRequest(this.apiUrl + '/v1/extract', request, headers)
            if (response.status === 200) {
                const extractResponse = response.data as ExtractResponse
                if (waitUntilDone) {
                    return this.monitorExtractStatus(extractResponse.id, headers, pollInterval)
                } else {
                    return extractResponse
                }
            } else {
                this.handleError(response, 'start extract job')
            }
        } catch (error: any) {
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
            const statusResponse: AxiosResponse = await this.getRequest(this.apiUrl + `/v1/crawl/${jobId}`, headers)
            if (statusResponse.status === 200) {
                const statusData = statusResponse.data as CrawlStatusResponse
                switch (statusData.status) {
                    case 'completed':
                        isJobCompleted = true
                        return statusData
                    case 'scraping':
                    case 'failed':
                        if (statusData.status === 'failed') {
                            throw new Error('Crawl job failed')
                        }
                        await new Promise((resolve) => setTimeout(resolve, Math.max(checkInterval, 2) * 1000))
                        break
                    default:
                        throw new Error(`Unknown crawl status: ${statusData.status}`)
                }
            } else {
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
            throw new Error(`Failed to ${action}. Status code: ${response.status}. Error: ${errorMessage}`)
        } else {
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

        if (this.mode === 'scrape') {
            const response = await app.scrapeUrl(this.url, this.params)
            if (!response.success) {
                throw new Error(`Firecrawl: Failed to scrape URL. Error: ${response.error}`)
            }
            firecrawlDocs = [response.data as FirecrawlDocument]
        } else if (this.mode === 'crawl') {
            const response = await app.crawlUrl(this.url, this.params, true)
            if ('data' in response) {
                firecrawlDocs = response.data || []
            } else {
                throw new Error('Crawl completed but no data was returned')
            }
        } else if (this.mode === 'extract') {
            this.params!.urls = [this.url]
            const response = await app.extract(this.params as any as ExtractRequest)
            if (!response.success) {
                throw new Error(`Firecrawl: Failed to extract URL.`)
            }
            firecrawlDocs = [response.data as FirecrawlDocument]
        } else if (this.mode === 'getExtractStatus') {
            const jobId = this.params?.jobId as string
            const response = await app.getExtractStatus(jobId)
            if (!response.success) {
                throw new Error(`Firecrawl: Failed to get extract status.`)
            }
            return response.data
        } else {
            throw new Error(`Unrecognized mode '${this.mode}'. Expected one of 'crawl', 'scrape', 'extract'.`)
        }

        if (this.mode === 'extract') {
            const newDoc = new Document({
                pageContent: JSON.stringify(firecrawlDocs),
                metadata: {}
            })
            return [newDoc]
        }

        return firecrawlDocs.map(
            (doc) =>
                new Document({
                    pageContent: doc.markdown || '',
                    metadata: doc.metadata || {}
                })
        )
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
        const loader = new FireCrawlLoader(input)

        let docs = []

        if (textSplitter) {
            docs = await loader.loadAndSplit(textSplitter)
        } else {
            docs = await loader.load()
        }

        if (metadata) {
            const parsedMetadata = typeof metadata === 'object' ? metadata : JSON.parse(metadata)
            let finaldocs = []
            for (const doc of docs) {
                const newdoc = {
                    ...doc,
                    metadata: {
                        ...doc.metadata,
                        ...parsedMetadata
                    }
                }
                finaldocs.push(newdoc)
            }
            return finaldocs
        }

        if (output === 'document') {
            return docs
        } else {
            let finaltext = ''
            for (const doc of docs) {
                finaltext += `${doc.pageContent}\n`
            }
            return handleEscapeCharacters(finaltext, false)
        }
    }
}

module.exports = { nodeClass: FireCrawl_DocumentLoaders }

// FOR TESTING PURPOSES
// export { FireCrawl_DocumentLoaders }
