import { TextSplitter } from 'langchain/text_splitter'
import { Document, DocumentInterface } from '@langchain/core/documents'
import { BaseDocumentLoader } from 'langchain/document_loaders/base'
import { INode, INodeData, INodeParams, ICommonObject } from '../../../src/Interface'
import { getCredentialData, getCredentialParam } from '../../../src/utils'
import SpiderApp from './SpiderApp'

interface SpiderLoaderParameters {
    url: string
    apiKey?: string
    mode?: 'crawl' | 'scrape'
    limit?: number
    params?: Record<string, unknown>
}

class SpiderLoader extends BaseDocumentLoader {
    private apiKey: string
    private url: string
    private mode: 'crawl' | 'scrape'
    private limit?: number
    private params?: Record<string, unknown>

    constructor(loaderParams: SpiderLoaderParameters) {
        super()
        const { apiKey, url, mode = 'crawl', limit, params } = loaderParams
        if (!apiKey) {
            throw new Error('Spider API key not set. You can set it as SPIDER_API_KEY in your .env file, or pass it to Spider.')
        }

        this.apiKey = apiKey
        this.url = url
        this.mode = mode
        this.limit = Number(limit)
        this.params = params
    }

    public async load(): Promise<DocumentInterface[]> {
        const app = new SpiderApp({ apiKey: this.apiKey })
        let spiderDocs: any[]

        if (this.mode === 'scrape') {
            const response = await app.scrapeUrl(this.url, this.params)
            if (!response.success) {
                throw new Error(`Spider: Failed to scrape URL. Error: ${response.error}`)
            }
            spiderDocs = [response.data]
        } else if (this.mode === 'crawl') {
            if (this.params) {
                this.params.limit = this.limit
            }
            const response = await app.crawlUrl(this.url, this.params)
            if (!response.success) {
                throw new Error(`Spider: Failed to crawl URL. Error: ${response.error}`)
            }
            spiderDocs = response.data
        } else {
            throw new Error(`Unrecognized mode '${this.mode}'. Expected one of 'crawl', 'scrape'.`)
        }

        return spiderDocs.map(
            (doc) =>
                new Document({
                    pageContent: doc.content || '',
                    metadata: { source: doc.url }
                })
        )
    }
}

class Spider_DocumentLoaders implements INode {
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
        this.label = 'Spider Document Loaders'
        this.name = 'spiderDocumentLoaders'
        this.version = 1.0
        this.type = 'Document'
        this.icon = 'spider.svg'
        this.category = 'Document Loaders'
        this.description = 'Scrape & Crawl the web with Spider'
        this.baseClasses = [this.type]
        this.inputs = [
            {
                label: 'Text Splitter',
                name: 'textSplitter',
                type: 'TextSplitter',
                optional: true
            },
            {
                label: 'Mode',
                name: 'mode',
                type: 'options',
                options: [
                    {
                        label: 'Scrape',
                        name: 'scrape',
                        description: 'Scrape a single page'
                    },
                    {
                        label: 'Crawl',
                        name: 'crawl',
                        description: 'Crawl a website and extract pages within the same domain'
                    }
                ],
                default: 'scrape'
            },
            {
                label: 'Web Page URL',
                name: 'url',
                type: 'string',
                placeholder: 'https://spider.cloud'
            },
            {
                label: 'Limit',
                name: 'limit',
                type: 'number',
                default: 25
            },
            {
                label: 'Additional Parameters',
                name: 'params',
                description:
                    'Find all the available parameters in the <a _target="blank" href="https://spider.cloud/docs/api">Spider API documentation</a>',
                additionalParams: true,
                placeholder: '{ "anti_bot": true }',
                type: 'json',
                optional: true
            }
        ]
        this.credential = {
            label: 'Credential',
            name: 'credential',
            type: 'credential',
            credentialNames: ['spiderApi']
        }
    }

    async init(nodeData: INodeData, _: string, options: ICommonObject): Promise<any> {
        const textSplitter = nodeData.inputs?.textSplitter as TextSplitter
        const url = nodeData.inputs?.url as string
        const mode = nodeData.inputs?.mode as 'crawl' | 'scrape'
        const limit = nodeData.inputs?.limit as number
        let params = nodeData.inputs?.params || {}
        const credentialData = await getCredentialData(nodeData.credential ?? '', options)
        const spiderApiKey = getCredentialParam('spiderApiKey', credentialData, nodeData)

        if (typeof params === 'string') {
            try {
                params = JSON.parse(params)
            } catch (e) {
                throw new Error('Invalid JSON string provided for params')
            }
        }

        // Ensure return_format is set to markdown
        params.return_format = 'markdown'

        const input: SpiderLoaderParameters = {
            url,
            mode: mode as 'crawl' | 'scrape',
            apiKey: spiderApiKey,
            limit: limit as number,
            params: params as Record<string, unknown>
        }

        const loader = new SpiderLoader(input)

        let docs = []

        if (textSplitter) {
            docs = await loader.loadAndSplit(textSplitter)
        } else {
            docs = await loader.load()
        }

        return docs
    }
}

module.exports = { nodeClass: Spider_DocumentLoaders }
