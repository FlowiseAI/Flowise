import { ICommonObject, INode, INodeData, INodeOutputsValue, INodeParams } from '../../../src/Interface'
import { getCredentialData, getCredentialParam } from '../../../src/utils'
import { TextSplitter } from '@langchain/textsplitters'
import { Document } from '@langchain/core/documents'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface CRWScrapeParams {
    formats?: string[]
    onlyMainContent?: boolean
    renderJs?: string
    waitFor?: number
    cssSelector?: string
    xpath?: string
    includeTags?: string[]
    excludeTags?: string[]
    stealth?: boolean
    proxy?: string
    headers?: Record<string, string>
    integration?: string
}

interface CRWCrawlParams {
    maxDepth?: number
    maxPages?: number
    formats?: string[]
    onlyMainContent?: boolean
    integration?: string
}

interface CRWMapParams {
    maxDepth?: number
    useSitemap?: boolean
    integration?: string
}

interface CRWScrapeResult {
    success: boolean
    data?: {
        markdown?: string
        html?: string
        plainText?: string
        metadata?: Record<string, any>
    }
}

interface CRWCrawlResult {
    success: boolean
    status: string
    data?: Array<{
        markdown?: string
        html?: string
        plainText?: string
        metadata?: Record<string, any>
    }>
}

interface CRWMapResult {
    success: boolean
    links?: string[]
}

// ---------------------------------------------------------------------------
// CRW HTTP Client (embedded, no external SDK dependency)
// ---------------------------------------------------------------------------

class CRWClient {
    private apiUrl: string
    private apiKey?: string
    private headers: Record<string, string>

    constructor(config: { apiUrl: string; apiKey?: string }) {
        this.apiUrl = config.apiUrl.replace(/\/+$/, '')
        this.apiKey = config.apiKey
        this.headers = {
            'Content-Type': 'application/json',
            ...(this.apiKey ? { Authorization: `Bearer ${this.apiKey}` } : {})
        }
    }

    async scrape(url: string, params: CRWScrapeParams): Promise<CRWScrapeResult> {
        const body = { url, ...params, integration: 'flowise' }
        const resp = await fetch(`${this.apiUrl}/v1/scrape`, {
            method: 'POST',
            headers: this.headers,
            body: JSON.stringify(body)
        })
        if (!resp.ok) {
            const text = await resp.text()
            throw new Error(`CRW scrape failed (${resp.status}): ${text}`)
        }
        return resp.json() as Promise<CRWScrapeResult>
    }

    async crawl(url: string, params: CRWCrawlParams): Promise<CRWCrawlResult> {
        const body = { url, ...params, integration: 'flowise' }
        const startResp = await fetch(`${this.apiUrl}/v1/crawl`, {
            method: 'POST',
            headers: this.headers,
            body: JSON.stringify(body)
        })
        if (!startResp.ok) {
            const text = await startResp.text()
            throw new Error(`CRW crawl start failed (${startResp.status}): ${text}`)
        }
        const startData = (await startResp.json()) as { success: boolean; id?: string }
        if (!startData.id) {
            throw new Error('CRW crawl did not return a job ID')
        }

        // Poll until completed or failed
        const jobId = startData.id
        const maxWaitMs = 5 * 60 * 1000 // 5 minutes
        const pollIntervalMs = 2000
        const startTime = Date.now()

        while (Date.now() - startTime < maxWaitMs) {
            await new Promise((resolve) => setTimeout(resolve, pollIntervalMs))
            const statusResp = await fetch(`${this.apiUrl}/v1/crawl/${jobId}`, {
                method: 'GET',
                headers: this.headers
            })
            if (!statusResp.ok) {
                const text = await statusResp.text()
                throw new Error(`CRW crawl poll failed (${statusResp.status}): ${text}`)
            }
            const statusData = (await statusResp.json()) as CRWCrawlResult
            if (statusData.status === 'completed') {
                return statusData
            }
            if (statusData.status === 'failed') {
                throw new Error('CRW crawl job failed')
            }
        }
        throw new Error('CRW crawl timed out after 5 minutes')
    }

    async map(url: string, params: CRWMapParams): Promise<CRWMapResult> {
        const body = { url, ...params, integration: 'flowise' }
        const resp = await fetch(`${this.apiUrl}/v1/map`, {
            method: 'POST',
            headers: this.headers,
            body: JSON.stringify(body)
        })
        if (!resp.ok) {
            const text = await resp.text()
            throw new Error(`CRW map failed (${resp.status}): ${text}`)
        }
        return resp.json() as Promise<CRWMapResult>
    }
}

// ---------------------------------------------------------------------------
// Node Definition
// ---------------------------------------------------------------------------

class CRW_DocumentLoaders implements INode {
    label: string
    name: string
    version: number
    type: string
    icon: string
    category: string
    description: string
    baseClasses: string[]
    credential: INodeParams
    inputs: INodeParams[]
    outputs: INodeOutputsValue[]

    constructor() {
        this.label = 'CRW'
        this.name = 'crw'
        this.version = 1.0
        this.type = 'Document'
        this.icon = 'crw.svg'
        this.category = 'Document Loaders'
        this.description = 'Scrape or crawl websites using CRW — the AI-native web scraper'
        this.baseClasses = [this.type]
        this.credential = {
            label: 'CRW API',
            name: 'credential',
            type: 'credential',
            credentialNames: ['crwApi'],
            optional: true
        }
        this.inputs = [
            // --- Primary inputs ---
            {
                label: 'Text Splitter',
                name: 'textSplitter',
                type: 'TextSplitter',
                optional: true
            },
            {
                label: 'Type',
                name: 'crwType',
                type: 'options',
                options: [
                    { label: 'Scrape', name: 'scrape', description: 'Scrape a single URL' },
                    { label: 'Crawl', name: 'crawl', description: 'Crawl a site (BFS, multi-page)' },
                    { label: 'Map', name: 'map', description: 'Discover all URLs on a site' }
                ],
                default: 'scrape'
            },
            {
                label: 'URL',
                name: 'url',
                type: 'string',
                placeholder: 'https://example.com'
            },
            {
                label: 'Metadata',
                name: 'metadata',
                type: 'json',
                optional: true,
                additionalParams: true
            },

            // --- Scrape-specific inputs ---
            {
                label: 'Only Main Content',
                name: 'onlyMainContent',
                type: 'boolean',
                default: true,
                optional: true,
                additionalParams: true,
                show: { crwType: ['scrape', 'crawl'] },
                description: 'Strip navigation, footer, and sidebar elements'
            },
            {
                label: 'JS Rendering',
                name: 'renderJs',
                type: 'options',
                options: [
                    { label: 'Auto (detect SPAs)', name: 'auto' },
                    { label: 'Force (always render)', name: 'force' },
                    { label: 'Off (no rendering)', name: 'off' }
                ],
                default: 'auto',
                optional: true,
                additionalParams: true,
                show: { crwType: ['scrape'] },
                description: 'Control JavaScript rendering behavior'
            },
            {
                label: 'Wait For (ms)',
                name: 'waitFor',
                type: 'number',
                optional: true,
                additionalParams: true,
                show: { crwType: ['scrape'] },
                description: 'Wait time in milliseconds after page load / JS render',
                placeholder: '1000'
            },
            {
                label: 'CSS Selector',
                name: 'cssSelector',
                type: 'string',
                optional: true,
                additionalParams: true,
                show: { crwType: ['scrape'] },
                description: 'Extract only content matching this CSS selector',
                placeholder: 'article.main-content'
            },
            {
                label: 'XPath',
                name: 'xpath',
                type: 'string',
                optional: true,
                additionalParams: true,
                show: { crwType: ['scrape'] },
                description: 'Extract content using XPath expression (alternative to CSS selector)',
                placeholder: '//article'
            },
            {
                label: 'Include Tags',
                name: 'includeTags',
                type: 'string',
                optional: true,
                additionalParams: true,
                show: { crwType: ['scrape'] },
                description: 'Comma-separated CSS selectors of elements to include',
                placeholder: 'article, main, .content'
            },
            {
                label: 'Exclude Tags',
                name: 'excludeTags',
                type: 'string',
                optional: true,
                additionalParams: true,
                show: { crwType: ['scrape'] },
                description: 'Comma-separated CSS selectors of elements to exclude',
                placeholder: 'nav, footer, .sidebar, .ads'
            },
            {
                label: 'Output Format',
                name: 'outputFormat',
                type: 'options',
                options: [
                    { label: 'Markdown', name: 'markdown' },
                    { label: 'HTML', name: 'html' },
                    { label: 'Plain Text', name: 'plainText' }
                ],
                default: 'markdown',
                optional: true,
                additionalParams: true,
                show: { crwType: ['scrape'] },
                description: 'Content format for scraped pages'
            },
            {
                label: 'Stealth Mode',
                name: 'stealth',
                type: 'boolean',
                default: false,
                optional: true,
                additionalParams: true,
                show: { crwType: ['scrape'] },
                description: 'Use browser-like headers to avoid bot detection'
            },
            {
                label: 'Proxy',
                name: 'proxy',
                type: 'string',
                optional: true,
                additionalParams: true,
                show: { crwType: ['scrape'] },
                description: 'Proxy URL for this request',
                placeholder: 'http://user:pass@proxy:8080'
            },
            {
                label: 'Custom Headers',
                name: 'customHeaders',
                type: 'json',
                optional: true,
                additionalParams: true,
                show: { crwType: ['scrape'] },
                description: 'Custom HTTP headers as JSON object'
            },

            // --- Crawl-specific inputs ---
            {
                label: 'Max Depth',
                name: 'maxDepth',
                type: 'number',
                default: 2,
                optional: true,
                additionalParams: true,
                show: { crwType: ['crawl', 'map'] },
                description: 'Maximum link-follow depth from the start URL'
            },
            {
                label: 'Max Pages',
                name: 'maxPages',
                type: 'number',
                default: 100,
                optional: true,
                additionalParams: true,
                show: { crwType: ['crawl'] },
                description: 'Maximum number of pages to scrape'
            },

            // --- Map-specific inputs ---
            {
                label: 'Use Sitemap',
                name: 'useSitemap',
                type: 'boolean',
                default: true,
                optional: true,
                additionalParams: true,
                show: { crwType: ['map'] },
                description: 'Also read sitemap.xml for URL discovery'
            }
        ]
        this.outputs = [
            {
                label: 'Document',
                name: 'document',
                description: 'Array of document objects with metadata and pageContent',
                baseClasses: [...this.baseClasses, 'json']
            },
            {
                label: 'Text',
                name: 'text',
                description: 'Concatenated string from pageContent of all documents',
                baseClasses: ['string', 'json']
            }
        ]
    }

    async init(nodeData: INodeData, _: string, options: ICommonObject): Promise<any> {
        // --- Credentials ---
        const credentialData = await getCredentialData(nodeData.credential ?? '', options)
        const apiKey = getCredentialParam('crwApiKey', credentialData, nodeData)
        const apiUrl = getCredentialParam('crwApiUrl', credentialData, nodeData) || 'http://localhost:3000'

        // --- Inputs ---
        const crwType = (nodeData.inputs?.crwType as string) || 'scrape'
        const url = nodeData.inputs?.url as string
        const textSplitter = nodeData.inputs?.textSplitter as TextSplitter | undefined
        const metadata = nodeData.inputs?.metadata
        const output = nodeData.outputs?.output as string

        if (!url) {
            throw new Error('URL is required')
        }

        const client = new CRWClient({ apiUrl, apiKey })
        let docs: Document[] = []

        // --- Execute based on mode ---
        if (crwType === 'scrape') {
            const onlyMainContent = nodeData.inputs?.onlyMainContent as boolean
            const renderJs = nodeData.inputs?.renderJs as string | undefined
            const waitFor = nodeData.inputs?.waitFor as number | undefined
            const cssSelector = nodeData.inputs?.cssSelector as string | undefined
            const xpath = nodeData.inputs?.xpath as string | undefined
            const includeTags = nodeData.inputs?.includeTags as string | undefined
            const excludeTags = nodeData.inputs?.excludeTags as string | undefined
            const outputFormat = (nodeData.inputs?.outputFormat as string) || 'markdown'
            const stealth = nodeData.inputs?.stealth as boolean | undefined
            const proxy = nodeData.inputs?.proxy as string | undefined
            const customHeaders = nodeData.inputs?.customHeaders as string | undefined

            const params: CRWScrapeParams = {
                formats: [outputFormat],
                onlyMainContent: onlyMainContent ?? true
            }
            if (renderJs && renderJs !== 'auto') params.renderJs = renderJs
            if (waitFor) params.waitFor = waitFor
            if (cssSelector) params.cssSelector = cssSelector
            if (xpath) params.xpath = xpath
            if (includeTags) params.includeTags = includeTags.split(',').map((s) => s.trim())
            if (excludeTags) params.excludeTags = excludeTags.split(',').map((s) => s.trim())
            if (stealth) params.stealth = stealth
            if (proxy) params.proxy = proxy
            if (customHeaders) {
                try {
                    params.headers = typeof customHeaders === 'string' ? JSON.parse(customHeaders) : customHeaders
                } catch {
                    throw new Error('Custom Headers must be valid JSON')
                }
            }

            const result = await client.scrape(url, params)
            if (!result.success || !result.data) {
                throw new Error('CRW scrape returned no data')
            }

            const content = result.data[outputFormat as keyof typeof result.data] as string || ''
            const pageMetadata = result.data.metadata || {}

            docs = [
                new Document({
                    pageContent: content,
                    metadata: {
                        title: pageMetadata.title,
                        description: pageMetadata.description,
                        sourceURL: pageMetadata.sourceURL || url,
                        statusCode: pageMetadata.statusCode,
                        language: pageMetadata.language
                    }
                })
            ]
        } else if (crwType === 'crawl') {
            const onlyMainContent = nodeData.inputs?.onlyMainContent as boolean
            const maxDepth = nodeData.inputs?.maxDepth as number | undefined
            const maxPages = nodeData.inputs?.maxPages as number | undefined

            const params: CRWCrawlParams = {
                formats: ['markdown'],
                onlyMainContent: onlyMainContent ?? true
            }
            if (maxDepth !== undefined) params.maxDepth = maxDepth
            if (maxPages !== undefined) params.maxPages = maxPages

            const result = await client.crawl(url, params)
            if (!result.success || !result.data) {
                throw new Error('CRW crawl returned no data')
            }

            docs = result.data.map((page) => {
                const pageMetadata = page.metadata || {}
                return new Document({
                    pageContent: page.markdown || page.html || page.plainText || '',
                    metadata: {
                        title: pageMetadata.title,
                        description: pageMetadata.description,
                        sourceURL: pageMetadata.sourceURL,
                        statusCode: pageMetadata.statusCode,
                        language: pageMetadata.language
                    }
                })
            })
        } else if (crwType === 'map') {
            const maxDepth = nodeData.inputs?.maxDepth as number | undefined
            const useSitemap = nodeData.inputs?.useSitemap as boolean | undefined

            const params: CRWMapParams = {}
            if (maxDepth !== undefined) params.maxDepth = maxDepth
            if (useSitemap !== undefined) params.useSitemap = useSitemap

            const result = await client.map(url, params)
            if (!result.success || !result.links) {
                throw new Error('CRW map returned no data')
            }

            docs = result.links.map(
                (link) =>
                    new Document({
                        pageContent: link,
                        metadata: { sourceURL: link }
                    })
            )
        }

        // --- Text splitting ---
        if (textSplitter) {
            docs = await textSplitter.splitDocuments(docs)
        }

        // --- Merge user metadata ---
        if (metadata) {
            const parsed = typeof metadata === 'string' ? JSON.parse(metadata) : metadata
            docs = docs.map((doc) => ({
                ...doc,
                metadata: { ...doc.metadata, ...parsed }
            }))
        }

        // --- Output selection ---
        if (output === 'text') {
            return docs.map((doc) => doc.pageContent).join('\n\n')
        }
        return docs
    }
}

module.exports = { nodeClass: CRW_DocumentLoaders }
