import { TextSplitter } from 'langchain/text_splitter'
import { Document, DocumentInterface } from '@langchain/core/documents'
import { BaseDocumentLoader } from 'langchain/document_loaders/base'
import { INode, INodeData, INodeParams, ICommonObject } from '../../../src/Interface'
import { getCredentialData, getCredentialParam } from '../../../src/utils'
import FirecrawlApp from '@mendable/firecrawl-js'

/**
 * Interface representing the parameters for the Firecrawl loader. It
 * includes properties such as the URL to scrape or crawl and the API key.
 */
interface FirecrawlLoaderParameters {
    /**
     * URL to scrape or crawl
     */
    url: string

    /**
     * API key for Firecrawl. If not provided, the default value is the value of the FIRECRAWL_API_KEY environment variable.
     */
    apiKey?: string

    /**
     * Mode of operation. Can be either "crawl" or "scrape". If not provided, the default value is "crawl".
     */
    mode?: 'crawl' | 'scrape'
    params?: Record<string, unknown>
}

interface FirecrawlDocument {
    markdown: string
    metadata: Record<string, unknown>
}

class FireCrawlLoader extends BaseDocumentLoader {
    private apiKey: string

    private url: string

    private mode: 'crawl' | 'scrape'

    private params?: Record<string, unknown>

    constructor(loaderParams: FirecrawlLoaderParameters) {
        super()
        const { apiKey, url, mode = 'crawl', params } = loaderParams
        if (!apiKey) {
            throw new Error('Firecrawl API key not set. You can set it as FIRECRAWL_API_KEY in your .env file, or pass it to Firecrawl.')
        }

        this.apiKey = apiKey
        this.url = url
        this.mode = mode
        this.params = params
    }

    /**
     * Loads the data from the Firecrawl.
     * @returns An array of Documents representing the retrieved data.
     * @throws An error if the data could not be loaded.
     */
    public async load(): Promise<DocumentInterface[]> {
        const app = new FirecrawlApp({ apiKey: this.apiKey })
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
            },
            {
                label: 'Max crawl pages',
                name: 'maxCrawlPages',
                type: 'number',
                optional: true,
                default: 3,
                additionalParams: true
            },
            {
                label: 'URL Patterns Include',
                name: 'urlPatternsIncludes',
                type: 'string',
                rows: 4,
                description: 'URL patterns to include. An array of string, separated by comma',
                optional: true,
                additionalParams: true
            },
            {
                label: 'URL Patterns Exclude',
                name: 'urlPatternsExcludes',
                type: 'string',
                rows: 4,
                description: 'URL patterns to exclude. An array of string, separated by comma',
                optional: true,
                additionalParams: true
            },
            {
                label: 'Generate Image Alt Text',
                name: 'generateImgAltText',
                type: 'boolean',
                description: 'Generate alt text for images using LLMs (must have a paid plan)',
                optional: true,
                additionalParams: true
            },
            {
                label: 'Return Only Urls',
                name: 'returnOnlyUrls',
                type: 'boolean',
                description:
                    'f true, returns only the URLs as a list on the crawl status. Attention: the return response will be a list of URLs inside the data, not a list of documents.',
                optional: true,
                additionalParams: true
            },
            {
                label: 'Only Main Content',
                name: 'onlyMainContent',
                type: 'boolean',
                description: 'Only return the main content of the page excluding headers, navs, footers, etc.',
                optional: true,
                additionalParams: true
            },
            {
                label: 'Metadata',
                name: 'metadata',
                type: 'json',
                optional: true,
                additionalParams: true
            }
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

        // Get input options and merge with additional input
        const url = nodeData.inputs?.url as string
        const crawlerType = nodeData.inputs?.crawlerType as string
        const maxCrawlPages = nodeData.inputs?.maxCrawlPages as string
        const generateImgAltText = nodeData.inputs?.generateImgAltText as boolean
        const returnOnlyUrls = nodeData.inputs?.returnOnlyUrls as boolean
        const onlyMainContent = nodeData.inputs?.onlyMainContent as boolean

        // Get API token from credential data
        const credentialData = await getCredentialData(nodeData.credential ?? '', options)
        const firecrawlApiToken = getCredentialParam('firecrawlApiToken', credentialData, nodeData)

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
