import { TextSplitter } from 'langchain/text_splitter'
import { Document, DocumentInterface } from '@langchain/core/documents'
import { BaseDocumentLoader } from 'langchain/document_loaders/base'
import { INode, INodeData, INodeParams, ICommonObject } from '../../../src/Interface'
import { getCredentialData, getCredentialParam } from '../../../src/utils'
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
    // ... (other metadata fields)
    [key: string]: any
}

interface FirecrawlDocument {
    id?: string
    url?: string
    content: string
    markdown?: string
    html?: string
    llm_extraction?: Record<string, any>
    createdAt?: Date
    updatedAt?: Date
    type?: string
    metadata: FirecrawlDocumentMetadata
    childrenLinks?: string[]
    provider?: string
    warning?: string
    index?: number
}

interface ScrapeResponse {
    success: boolean
    data?: FirecrawlDocument
    error?: string
}

interface CrawlResponse {
    success: boolean
    jobId?: string
    data?: FirecrawlDocument[]
    error?: string
}

interface Params {
    [key: string]: any
    extractorOptions?: {
        extractionSchema: z.ZodSchema | any
        mode?: 'llm-extraction'
        extractionPrompt?: string
    }
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
            const response: AxiosResponse = await this.postRequest(this.apiUrl + '/v0/scrape', jsonData, headers)
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
    ): Promise<CrawlResponse | any> {
        const headers = this.prepareHeaders(idempotencyKey)
        let jsonData: Params = { url, ...params }
        try {
            const response: AxiosResponse = await this.postRequest(this.apiUrl + '/v0/crawl', jsonData, headers)
            if (response.status === 200) {
                const jobId: string = response.data.jobId
                if (waitUntilDone) {
                    return this.monitorJobStatus(jobId, headers, pollInterval)
                } else {
                    return { success: true, jobId }
                }
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
        return axios.post(url, data, { headers })
    }

    private getRequest(url: string, headers: AxiosRequestHeaders): Promise<AxiosResponse> {
        return axios.get(url, { headers })
    }

    private async monitorJobStatus(jobId: string, headers: AxiosRequestHeaders, checkInterval: number): Promise<any> {
        let isJobCompleted = false
        while (!isJobCompleted) {
            const statusResponse: AxiosResponse = await this.getRequest(this.apiUrl + `/v0/crawl/status/${jobId}`, headers)
            if (statusResponse.status === 200) {
                const statusData = statusResponse.data
                switch (statusData.status) {
                    case 'completed':
                        isJobCompleted = true
                        if ('data' in statusData) {
                            return statusData.data
                        } else {
                            throw new Error('Crawl job completed but no data was returned')
                        }
                    case 'active':
                    case 'paused':
                    case 'pending':
                    case 'queued':
                        await new Promise((resolve) => setTimeout(resolve, Math.max(checkInterval, 2) * 1000))
                        break
                    default:
                        throw new Error(`Crawl job failed or was stopped. Status: ${statusData.status}`)
                }
            } else {
                this.handleError(statusResponse, 'check crawl status')
            }
        }
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
    mode?: 'crawl' | 'scrape'
    params?: Record<string, unknown>
}

class FireCrawlLoader extends BaseDocumentLoader {
    private apiKey: string
    private apiUrl: string
    private url: string
    private mode: 'crawl' | 'scrape'
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
            firecrawlDocs = response as FirecrawlDocument[]
        } else {
            throw new Error(`Unrecognized mode '${this.mode}'. Expected one of 'crawl', 'scrape'.`)
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

    constructor() {
        this.label = 'FireCrawl'
        this.name = 'fireCrawl'
        this.type = 'Document'
        this.icon = 'firecrawl.png'
        this.version = 1.0
        this.category = 'Document Loaders'
        this.description = 'Load data from URL using FireCrawl'
        this.baseClasses = [this.type]
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
                description: 'URL to be crawled/scraped',
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
                    }
                ],
                default: 'crawl'
            }
            // ... (other input parameters)
        ]
        this.credential = {
            label: 'FireCrawl API',
            name: 'credential',
            type: 'credential',
            credentialNames: ['fireCrawlApi']
        }
    }

    async init(nodeData: INodeData, _: string, options: ICommonObject): Promise<any> {
        const textSplitter = nodeData.inputs?.textSplitter as TextSplitter
        const metadata = nodeData.inputs?.metadata
        const url = nodeData.inputs?.url as string
        const crawlerType = nodeData.inputs?.crawlerType as string
        const maxCrawlPages = nodeData.inputs?.maxCrawlPages as string
        const generateImgAltText = nodeData.inputs?.generateImgAltText as boolean
        const returnOnlyUrls = nodeData.inputs?.returnOnlyUrls as boolean
        const onlyMainContent = nodeData.inputs?.onlyMainContent as boolean
        const credentialData = await getCredentialData(nodeData.credential ?? '', options)
        const firecrawlApiToken = getCredentialParam('firecrawlApiToken', credentialData, nodeData)
        const firecrawlApiUrl = getCredentialParam('firecrawlApiUrl', credentialData, nodeData, 'https://api.firecrawl.dev')

        const urlPatternsExcludes = nodeData.inputs?.urlPatternsExcludes
            ? (nodeData.inputs.urlPatternsExcludes.split(',') as string[])
            : undefined
        const urlPatternsIncludes = nodeData.inputs?.urlPatternsIncludes
            ? (nodeData.inputs.urlPatternsIncludes.split(',') as string[])
            : undefined

        const input: FirecrawlLoaderParameters = {
            url,
            mode: crawlerType as 'crawl' | 'scrape',
            apiKey: firecrawlApiToken,
            apiUrl: firecrawlApiUrl,
            params: {
                crawlerOptions: {
                    includes: urlPatternsIncludes,
                    excludes: urlPatternsExcludes,
                    generateImgAltText,
                    returnOnlyUrls,
                    limit: maxCrawlPages ? parseFloat(maxCrawlPages) : undefined
                },
                pageOptions: {
                    onlyMainContent
                }
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

        return docs
    }
}

module.exports = { nodeClass: FireCrawl_DocumentLoaders }
