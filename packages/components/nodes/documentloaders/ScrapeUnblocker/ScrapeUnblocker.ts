import { omit } from 'lodash'
import { TextSplitter } from '@langchain/classic/text_splitter'
import { Document, DocumentInterface } from '@langchain/core/documents'
import { BaseDocumentLoader } from '@langchain/classic/document_loaders/base'
import { INode, INodeData, INodeParams, ICommonObject, INodeOutputsValue } from '../../../src/Interface'
import { getCredentialData, getCredentialParam, handleEscapeCharacters } from '../../../src/utils'
import { AxiosRequestConfig } from 'axios'
import { secureAxiosRequest } from '../../../src/httpSecurity'

interface ScrapeUnblockerLoaderParameters {
    apiKey?: string
    apiUrl: string
    mode: 'scrape' | 'search'
    url?: string
    keyword?: string
    parsedData?: boolean
    proxyCountry?: string
    pagesToCheck?: number
    additionalMetadata?: Record<string, unknown>
}

class ScrapeUnblockerLoader extends BaseDocumentLoader {
    private apiKey: string
    private apiUrl: string
    private mode: 'scrape' | 'search'
    private url?: string
    private keyword?: string
    private parsedData: boolean
    private proxyCountry?: string
    private pagesToCheck?: number
    private additionalMetadata?: Record<string, unknown>

    constructor(loaderParams: ScrapeUnblockerLoaderParameters) {
        super()
        const { apiKey, apiUrl, mode, url, keyword, parsedData, proxyCountry, pagesToCheck, additionalMetadata } = loaderParams
        if (!apiKey) {
            throw new Error('ScrapeUnblocker API key not set. Please set it in the credential.')
        }

        this.apiKey = apiKey
        this.apiUrl = apiUrl.replace(/\/$/, '')
        this.mode = mode
        this.url = url
        this.keyword = keyword
        this.parsedData = parsedData ?? false
        this.proxyCountry = proxyCountry
        this.pagesToCheck = pagesToCheck
        this.additionalMetadata = additionalMetadata
    }

    private async request(path: string, params: Record<string, unknown>): Promise<any> {
        // Empty values are dropped so the API applies its own defaults.
        const query: Record<string, unknown> = {}
        for (const [key, value] of Object.entries(params)) {
            if (value !== undefined && value !== null && value !== '' && value !== false) {
                query[key] = value
            }
        }

        const config: AxiosRequestConfig = {
            method: 'POST',
            url: `${this.apiUrl}${path}`,
            params: query,
            headers: { 'X-ScrapeUnblocker-Key': this.apiKey }
        }

        const response = await secureAxiosRequest(config)
        return response.data
    }

    private async loadPage(): Promise<DocumentInterface[]> {
        if (!this.url) {
            throw new Error('ScrapeUnblocker: URL is required in Scrape mode.')
        }

        const data = await this.request('/getPageSource', {
            url: this.url,
            parsed_data: this.parsedData,
            proxy_country: this.proxyCountry
        })

        const pageContent = typeof data === 'string' ? data : JSON.stringify(data)

        return [
            new Document({
                pageContent,
                metadata: {
                    ...(this.additionalMetadata || {}),
                    source: this.url,
                    type: this.parsedData ? 'parsed_data' : 'html'
                }
            })
        ]
    }

    private async loadSearch(): Promise<DocumentInterface[]> {
        if (!this.keyword) {
            throw new Error('ScrapeUnblocker: Keyword is required in Search mode.')
        }

        const data = await this.request('/serpApi', {
            keyword: this.keyword,
            proxy_country: this.proxyCountry,
            pages_to_check: this.pagesToCheck
        })

        const organic = Array.isArray(data?.organic) ? data.organic : []
        if (!organic.length) {
            return [
                new Document({
                    pageContent: JSON.stringify(data ?? {}),
                    metadata: { ...(this.additionalMetadata || {}), source: this.keyword, type: 'serp' }
                })
            ]
        }

        return organic.map(
            (result: any) =>
                new Document({
                    pageContent: result.description || result.title || '',
                    metadata: {
                        ...(this.additionalMetadata || {}),
                        title: result.title,
                        source: result.url,
                        type: 'serp'
                    }
                })
        )
    }

    public async load(): Promise<DocumentInterface[]> {
        if (this.mode === 'scrape') {
            return this.loadPage()
        } else if (this.mode === 'search') {
            return this.loadSearch()
        }
        throw new Error(`Unrecognized mode '${this.mode}'. Expected one of 'scrape', 'search'.`)
    }
}

class ScrapeUnblocker_DocumentLoaders implements INode {
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
        this.label = 'ScrapeUnblocker'
        this.name = 'scrapeUnblocker'
        this.version = 1.0
        this.type = 'Document'
        this.icon = 'scrapeunblocker.png'
        this.category = 'Document Loaders'
        this.description = 'Load data from pages protected by anti-bot systems using ScrapeUnblocker'
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
                        description: 'Fetch a single page, bypassing anti-bot protection'
                    },
                    {
                        label: 'Search',
                        name: 'search',
                        description: 'Search Google and load the organic results'
                    }
                ],
                default: 'scrape'
            },
            {
                label: 'Web Page URL',
                name: 'url',
                type: 'string',
                placeholder: 'https://www.scrapeunblocker.com',
                show: {
                    mode: ['scrape']
                }
            },
            {
                label: 'Keyword',
                name: 'keyword',
                type: 'string',
                placeholder: 'best web scraping api',
                show: {
                    mode: ['search']
                }
            },
            {
                label: 'Parsed Data',
                name: 'parsedData',
                type: 'boolean',
                description: 'Return AI-parsed structured JSON instead of raw HTML',
                default: false,
                optional: true,
                additionalParams: true,
                show: {
                    mode: ['scrape']
                }
            },
            {
                label: 'Pages To Check',
                name: 'pagesToCheck',
                type: 'number',
                description: 'How many search result pages to load',
                default: 1,
                optional: true,
                additionalParams: true,
                show: {
                    mode: ['search']
                }
            },
            {
                label: 'Proxy Country',
                name: 'proxyCountry',
                type: 'string',
                description: 'Two-letter country code for the exit IP, for geo-restricted content',
                placeholder: 'us',
                optional: true,
                additionalParams: true
            },
            {
                label: 'Additional Metadata',
                name: 'additional_metadata',
                type: 'json',
                description: 'Additional metadata to be added to the extracted documents',
                optional: true,
                additionalParams: true
            },
            {
                label: 'Omit Metadata Keys',
                name: 'omitMetadataKeys',
                type: 'string',
                rows: 4,
                description:
                    'Each document loader comes with a default set of metadata keys that are extracted from the document. You can use this field to omit some of the default metadata keys. The value should be a list of keys, seperated by comma. Use * to omit all metadata keys execept the ones you specify in the Additional Metadata field',
                placeholder: 'key1, key2, key3.nestedKey1',
                optional: true,
                additionalParams: true
            }
        ]
        this.credential = {
            label: 'Credential',
            name: 'credential',
            type: 'credential',
            credentialNames: ['scrapeUnblockerApi']
        }
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
        const mode = nodeData.inputs?.mode as 'scrape' | 'search'
        const url = nodeData.inputs?.url as string
        const keyword = nodeData.inputs?.keyword as string
        const parsedData = nodeData.inputs?.parsedData as boolean
        const proxyCountry = nodeData.inputs?.proxyCountry as string
        const pagesToCheck = nodeData.inputs?.pagesToCheck as number
        let additionalMetadata = nodeData.inputs?.additional_metadata
        const _omitMetadataKeys = nodeData.inputs?.omitMetadataKeys as string
        const output = nodeData.outputs?.output as string

        const credentialData = await getCredentialData(nodeData.credential ?? '', options)
        const apiKey = getCredentialParam('scrapeUnblockerApiKey', credentialData, nodeData)
        const apiUrl = getCredentialParam('scrapeUnblockerApiUrl', credentialData, nodeData, 'https://api.scrapeunblocker.com')

        let omitMetadataKeys: string[] = []
        if (_omitMetadataKeys) {
            omitMetadataKeys = _omitMetadataKeys.split(',').map((key) => key.trim())
        }

        if (additionalMetadata) {
            if (typeof additionalMetadata === 'string') {
                try {
                    additionalMetadata = JSON.parse(additionalMetadata)
                } catch (e) {
                    console.error('Invalid JSON string provided for additional metadata')
                }
            } else if (typeof additionalMetadata !== 'object') {
                console.error('Additional metadata must be a valid JSON object')
            }
        } else {
            additionalMetadata = {}
        }

        const input: ScrapeUnblockerLoaderParameters = {
            apiKey,
            apiUrl,
            mode,
            url,
            keyword,
            parsedData,
            proxyCountry,
            pagesToCheck,
            additionalMetadata: additionalMetadata as Record<string, unknown>
        }

        const loader = new ScrapeUnblockerLoader(input)

        let docs = []

        if (textSplitter) {
            docs = await loader.load()
            docs = await textSplitter.splitDocuments(docs)
        } else {
            docs = await loader.load()
        }

        docs = docs.map((doc: DocumentInterface) => ({
            ...doc,
            metadata:
                _omitMetadataKeys === '*'
                    ? additionalMetadata
                    : omit(
                          {
                              ...doc.metadata,
                              ...additionalMetadata
                          },
                          omitMetadataKeys
                      )
        }))

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

module.exports = { nodeClass: ScrapeUnblocker_DocumentLoaders }
