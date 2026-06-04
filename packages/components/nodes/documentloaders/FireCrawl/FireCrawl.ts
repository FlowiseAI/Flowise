import { TextSplitter } from '@langchain/textsplitters'
import { Document, DocumentInterface } from '@langchain/core/documents'
import { BaseDocumentLoader } from '@langchain/classic/document_loaders/base'
import Firecrawl, {
    type Document as FirecrawlDocument,
    type ScrapeOptions,
    type CrawlOptions,
    type SearchRequest,
    type SearchResultWeb
} from 'firecrawl'
import { INode, INodeData, INodeParams, ICommonObject, INodeOutputsValue } from '../../../src/Interface'
import { getCredentialData, getCredentialParam, handleEscapeCharacters } from '../../../src/utils'

// Identifies Firecrawl requests originating from Flowise (carried through on every call).
const FIRECRAWL_INTEGRATION = 'flowise'

// Loader-level parameters bundled by the node before delegating to the v2 SDK.
interface ScrapeParams {
    includeTags?: string | string[]
    excludeTags?: string | string[]
    includePaths?: string | string[]
    excludePaths?: string | string[]
    onlyMainContent?: boolean
    mobile?: boolean
    skipTlsVerification?: boolean
    timeout?: number
    limit?: number
}

interface LoaderParams {
    [key: string]: any
    scrapeOptions?: ScrapeParams
    // crawl
    limit?: number
    maxDepth?: number
    maxDiscoveryDepth?: number
    ignoreQueryParameters?: boolean
    allowExternalLinks?: boolean
    delay?: number
    // extract
    schema?: Record<string, any>
    prompt?: string
    // search
    tbs?: string
    location?: string
    country?: string
    ignoreInvalidURLs?: boolean
}

// Normalize a value that may be a comma-separated string or an array into a string array.
function toStringArray(value?: string | string[]): string[] | undefined {
    if (value === undefined || value === null) return undefined
    const arr = Array.isArray(value) ? value : value.split(',')
    const cleaned = arr.map((v) => v.trim()).filter((v) => v.length > 0)
    return cleaned.length > 0 ? cleaned : undefined
}

// FireCrawl Loader
interface FirecrawlLoaderParameters {
    url?: string
    query?: string
    apiKey?: string
    apiUrl?: string
    mode?: 'crawl' | 'scrape' | 'extract' | 'search'
    params?: LoaderParams
}

export class FireCrawlLoader extends BaseDocumentLoader {
    private apiKey: string
    private apiUrl: string
    private url?: string
    private query?: string
    private mode: 'crawl' | 'scrape' | 'extract' | 'search'
    private params?: LoaderParams

    constructor(loaderParams: FirecrawlLoaderParameters) {
        super()
        const { apiKey, apiUrl, url, query, mode = 'crawl', params } = loaderParams
        if (!apiKey) {
            throw new Error('Firecrawl API key not set. You can set it as FIRECRAWL_API_KEY in your .env file, or pass it to Firecrawl.')
        }

        this.apiKey = apiKey
        this.url = url
        this.query = query
        this.mode = mode
        this.params = params
        this.apiUrl = apiUrl || 'https://api.firecrawl.dev'
    }

    // Build the v2 scrape options shared by scrape/crawl modes.
    private buildScrapeOptions(): ScrapeOptions {
        const scrapeOptions: ScrapeOptions = {
            formats: ['markdown'],
            onlyMainContent: true,
            integration: FIRECRAWL_INTEGRATION
        }

        const opts = this.params?.scrapeOptions
        if (opts) {
            const includeTags = toStringArray(opts.includeTags)
            if (includeTags) scrapeOptions.includeTags = includeTags

            const excludeTags = toStringArray(opts.excludeTags)
            if (excludeTags) scrapeOptions.excludeTags = excludeTags

            if (opts.onlyMainContent !== undefined) scrapeOptions.onlyMainContent = opts.onlyMainContent
            if (opts.mobile !== undefined) scrapeOptions.mobile = opts.mobile
            if (opts.skipTlsVerification !== undefined) scrapeOptions.skipTlsVerification = opts.skipTlsVerification
            if (opts.timeout) scrapeOptions.timeout = opts.timeout
        }

        return scrapeOptions
    }

    public async load(): Promise<DocumentInterface[]> {
        const app = new Firecrawl({ apiKey: this.apiKey, apiUrl: this.apiUrl })
        let firecrawlDocs: FirecrawlDocument[]

        if (this.mode === 'search') {
            if (!this.query) {
                throw new Error('Firecrawl: Query is required for search mode')
            }

            const searchReq: Omit<SearchRequest, 'query'> = {
                integration: FIRECRAWL_INTEGRATION
            }
            if (this.params?.limit !== undefined) searchReq.limit = this.params.limit
            if (this.params?.tbs) searchReq.tbs = this.params.tbs
            // v2 search exposes a single `location` string (v1's separate `country`/`lang` were removed).
            // Fall back to the country code so existing node configurations still influence results.
            const location = this.params?.location || this.params?.country
            if (location) searchReq.location = location
            if (this.params?.timeout !== undefined) searchReq.timeout = this.params.timeout
            if (this.params?.ignoreInvalidURLs !== undefined) searchReq.ignoreInvalidURLs = this.params.ignoreInvalidURLs

            const response = await app.search(this.query, searchReq)

            // v2 returns results grouped by source. Use web results and normalize each entry
            // (which may be a lightweight SearchResultWeb or a full Document when scrapeOptions are set).
            const webResults = response.web ?? []
            firecrawlDocs = webResults.map((result: SearchResultWeb | FirecrawlDocument) => {
                if ('markdown' in result || 'html' in result || 'metadata' in result) {
                    return result as FirecrawlDocument
                }
                const web = result as SearchResultWeb
                return {
                    markdown: web.description,
                    metadata: {
                        title: web.title,
                        sourceURL: web.url,
                        description: web.description
                    }
                } as FirecrawlDocument
            })
        } else if (this.mode === 'scrape') {
            if (!this.url) {
                throw new Error('Firecrawl: URL is required for scrape mode')
            }
            const response = await app.scrape(this.url, this.buildScrapeOptions())
            firecrawlDocs = [response]
        } else if (this.mode === 'crawl') {
            if (!this.url) {
                throw new Error('Firecrawl: URL is required for crawl mode')
            }

            const crawlOptions: CrawlOptions & { pollInterval?: number } = {
                integration: FIRECRAWL_INTEGRATION,
                pollInterval: 2,
                scrapeOptions: this.buildScrapeOptions()
            }

            const includePaths = toStringArray(this.params?.scrapeOptions?.includePaths)
            if (includePaths) crawlOptions.includePaths = includePaths

            const excludePaths = toStringArray(this.params?.scrapeOptions?.excludePaths)
            if (excludePaths) crawlOptions.excludePaths = excludePaths

            const limit = this.params?.scrapeOptions?.limit ?? this.params?.limit
            if (limit !== undefined && limit !== null) crawlOptions.limit = limit
            if (this.params?.maxDiscoveryDepth !== undefined) crawlOptions.maxDiscoveryDepth = this.params.maxDiscoveryDepth
            if (this.params?.ignoreQueryParameters !== undefined) crawlOptions.ignoreQueryParameters = this.params.ignoreQueryParameters
            if (this.params?.allowExternalLinks !== undefined) crawlOptions.allowExternalLinks = this.params.allowExternalLinks
            if (this.params?.delay !== undefined) crawlOptions.delay = this.params.delay

            const response = await app.crawl(this.url, crawlOptions)
            if (response.status === 'failed') {
                throw new Error('Firecrawl: Crawl job failed')
            }
            firecrawlDocs = response.data || []
        } else if (this.mode === 'extract') {
            if (!this.url) {
                throw new Error('Firecrawl: URL is required for extract mode')
            }

            const response = await app.extract({
                urls: [this.url],
                prompt: this.params?.prompt,
                schema: this.params?.schema,
                integration: FIRECRAWL_INTEGRATION
            })

            if (response.data) {
                const content = JSON.stringify(response.data, null, 2)
                const metadata: Record<string, any> = {
                    source: this.url,
                    type: 'extracted_data',
                    data: response.data
                }
                if (response.status) metadata.status = response.status
                if (response.expiresAt) metadata.expiresAt = response.expiresAt

                return [
                    new Document({
                        pageContent: content,
                        metadata
                    })
                ]
            }
            return []
        } else {
            throw new Error(`Unrecognized mode '${this.mode}'. Expected one of 'crawl', 'scrape', 'extract', 'search'.`)
        }

        // Convert Firecrawl documents to LangChain documents
        const documents = firecrawlDocs.map((doc) => {
            // Use markdown content if available, otherwise fallback to HTML or empty string
            const content = doc.markdown || doc.html || doc.rawHtml || ''

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
        this.version = 4.0
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
                label: 'Type',
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
                        label: 'Search',
                        name: 'search',
                        description: 'Search the web using FireCrawl'
                    }
                ],
                default: 'crawl'
            },
            {
                label: 'URLs',
                name: 'url',
                type: 'string',
                description: 'URL to be crawled/scraped/extracted',
                placeholder: 'https://docs.flowiseai.com',
                optional: true,
                show: {
                    crawlerType: ['crawl', 'scrape', 'extract']
                }
            },
            {
                // includeTags
                label: 'Include Tags',
                name: 'includeTags',
                type: 'string',
                description: 'Tags to include in the output. Use comma to separate multiple tags.',
                optional: true,
                additionalParams: true,
                show: {
                    crawlerType: ['scrape']
                }
            },
            {
                // excludeTags
                label: 'Exclude Tags',
                name: 'excludeTags',
                type: 'string',
                description: 'Tags to exclude from the output. Use comma to separate multiple tags.',
                optional: true,
                additionalParams: true,
                show: {
                    crawlerType: ['scrape']
                }
            },
            {
                // onlyMainContent
                label: 'Only Main Content',
                name: 'onlyMainContent',
                type: 'boolean',
                description: 'Extract only the main content of the page',
                optional: true,
                additionalParams: true,
                show: {
                    crawlerType: ['scrape']
                }
            },
            {
                // limit
                label: 'Limit',
                name: 'limit',
                type: 'string',
                description: 'Maximum number of pages to crawl',
                optional: true,
                additionalParams: true,
                default: '10000',
                show: {
                    crawlerType: ['crawl']
                }
            },
            {
                label: 'Include Paths',
                name: 'includePaths',
                type: 'string',
                description:
                    'URL pathname regex patterns that include matching URLs in the crawl. Only the paths that match the specified patterns will be included in the response.',
                placeholder: `blog/.*, news/.*`,
                optional: true,
                additionalParams: true,
                show: {
                    crawlerType: ['crawl']
                }
            },
            {
                label: 'Exclude Paths',
                name: 'excludePaths',
                type: 'string',
                description: 'URL pathname regex patterns that exclude matching URLs from the crawl.',
                placeholder: `blog/.*, news/.*`,
                optional: true,
                additionalParams: true,
                show: {
                    crawlerType: ['crawl']
                }
            },
            {
                label: 'Schema',
                name: 'extractSchema',
                type: 'json',
                description: 'JSON schema for data extraction',
                optional: true,
                additionalParams: true,
                show: {
                    crawlerType: ['extract']
                }
            },
            {
                label: 'Prompt',
                name: 'extractPrompt',
                type: 'string',
                description: 'Prompt for data extraction',
                optional: true,
                additionalParams: true,
                show: {
                    crawlerType: ['extract']
                }
            },
            {
                label: 'Query',
                name: 'searchQuery',
                type: 'string',
                description: 'Search query to find relevant content',
                optional: true,
                show: {
                    crawlerType: ['search']
                }
            },
            {
                label: 'Limit',
                name: 'searchLimit',
                type: 'string',
                description: 'Maximum number of results to return',
                optional: true,
                additionalParams: true,
                default: '5',
                show: {
                    crawlerType: ['search']
                }
            },
            {
                label: 'Language',
                name: 'searchLang',
                type: 'string',
                description: 'Language code for search results (e.g., en, es, fr)',
                optional: true,
                additionalParams: true,
                default: 'en',
                show: {
                    crawlerType: ['search']
                }
            },
            {
                label: 'Country',
                name: 'searchCountry',
                type: 'string',
                description: 'Country code for search results (e.g., us, uk, ca)',
                optional: true,
                additionalParams: true,
                default: 'us',
                show: {
                    crawlerType: ['search']
                }
            },
            {
                label: 'Timeout',
                name: 'searchTimeout',
                type: 'number',
                description: 'Timeout in milliseconds for search operation',
                optional: true,
                additionalParams: true,
                default: 60000,
                show: {
                    crawlerType: ['search']
                }
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

        // Validate URL only for non-search methods
        if (crawlerType !== 'search' && !url) {
            throw new Error('Firecrawl: URL is required for ' + crawlerType + ' mode')
        }

        const includePaths = nodeData.inputs?.includePaths ? (nodeData.inputs.includePaths.split(',') as string[]) : undefined
        const excludePaths = nodeData.inputs?.excludePaths ? (nodeData.inputs.excludePaths.split(',') as string[]) : undefined

        const includeTags = nodeData.inputs?.includeTags ? (nodeData.inputs.includeTags.split(',') as string[]) : undefined
        const excludeTags = nodeData.inputs?.excludeTags ? (nodeData.inputs.excludeTags.split(',') as string[]) : undefined

        const extractSchema = nodeData.inputs?.extractSchema
        const extractPrompt = nodeData.inputs?.extractPrompt as string

        const searchQuery = nodeData.inputs?.searchQuery as string
        const searchLimit = nodeData.inputs?.searchLimit as string
        const searchCountry = nodeData.inputs?.searchCountry as string
        const searchTimeout = nodeData.inputs?.searchTimeout as number

        const input: FirecrawlLoaderParameters = {
            url,
            query: searchQuery,
            mode: crawlerType as 'crawl' | 'scrape' | 'extract' | 'search',
            apiKey: firecrawlApiToken,
            apiUrl: firecrawlApiUrl,
            params: {
                scrapeOptions: {
                    includePaths,
                    excludePaths,
                    limit: limit ? parseInt(limit, 10) : 1000,
                    includeTags,
                    excludeTags
                },
                schema: extractSchema || undefined,
                prompt: extractPrompt || undefined
            }
        }

        // Add search-specific parameters only when in search mode
        if (crawlerType === 'search') {
            if (!searchQuery) {
                throw new Error('Firecrawl: Search query is required for search mode')
            }
            input.params = {
                limit: searchLimit ? parseInt(searchLimit, 10) : 5,
                country: searchCountry,
                timeout: searchTimeout
            }
        }

        if (onlyMainContent === true) {
            const scrapeOptions = input.params?.scrapeOptions as any
            input.params!.scrapeOptions = {
                ...scrapeOptions,
                onlyMainContent: true
            }
        }

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
    }
}

module.exports = { nodeClass: FireCrawl_DocumentLoaders }

// FOR TESTING PURPOSES
// export { FireCrawl_DocumentLoaders }
