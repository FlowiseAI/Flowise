import { TextSplitter } from 'langchain/text_splitter'
import { DocumentInterface } from '@langchain/core/documents'
import { BaseDocumentLoader } from 'langchain/document_loaders/base'
import { INode, INodeData, INodeParams, ICommonObject, INodeOutputsValue } from '../../../src/Interface'
import { getCredentialData, getCredentialParam, handleEscapeCharacters } from '../../../src/utils'
import axios, { AxiosResponse } from 'axios'

interface OxylabsDocument extends DocumentInterface {}

interface OxylabsResponse {
    results: Result[]
    job: Job
}

interface Result {
    content: any
    created_at: string
    updated_at: string
    page: number
    url: string
    job_id: string
    is_render_forced: boolean
    status_code: number
    parser_type: string
}

interface Job {
    callback_url: string
    client_id: number
    context: any
    created_at: string
    domain: string
    geo_location: any
    id: string
    limit: number
    locale: any
    pages: number
    parse: boolean
    parser_type: any
    parser_preset: any
    parsing_instructions: any
    browser_instructions: any
    render: any
    url: any
    query: string
    source: string
    start_page: number
    status: string
    storage_type: any
    storage_url: any
    subdomain: string
    content_encoding: string
    updated_at: string
    user_agent_type: string
    is_premium_domain: boolean
}

interface OxylabsLoaderParameters {
    username: string
    password: string
    query: string
    source: string
    geo_location: string
    render: boolean
    parse: boolean
    user_agent_type: string
}

export class OxylabsLoader extends BaseDocumentLoader {
    private params: OxylabsLoaderParameters

    constructor(loaderParams: OxylabsLoaderParameters) {
        super()
        this.params = loaderParams
    }

    private async sendAPIRequest<R>(params: any): Promise<AxiosResponse<R, any>> {
        params = Object.fromEntries(Object.entries(params).filter(([_, value]) => value !== null && value !== '' && value !== undefined))

        const auth = Buffer.from(`${this.params.username}:${this.params.password}`).toString('base64')

        const response = await axios.post<R>('https://realtime.oxylabs.io/v1/queries', params, {
            headers: {
                'Content-Type': 'application/json',
                'x-oxylabs-sdk': 'oxylabs-integration-flowise/1.0.0 (1.0.0; 64bit)',
                Authorization: `Basic ${auth}`
            }
        })

        if (response.status >= 400) {
            throw new Error(`Oxylabs: Failed to call Oxylabs API: ${response.status}`)
        }

        return response
    }

    public async load(): Promise<DocumentInterface[]> {
        let isUrlSource = this.params.source == 'universal'

        const params = {
            source: this.params.source,
            geo_location: this.params.geo_location,
            render: this.params.render ? 'html' : null,
            parse: this.params.parse,
            user_agent_type: this.params.user_agent_type,
            markdown: !this.params.parse,
            url: isUrlSource ? this.params.query : null,
            query: !isUrlSource ? this.params.query : null
        }

        const response = await this.sendAPIRequest<OxylabsResponse>(params)

        const docs: OxylabsDocument[] = response.data.results.map((result, index) => {
            const content = typeof result.content === 'string' ? result.content : JSON.stringify(result.content)
            return {
                id: `${response.data.job.id.toString()}-${index}`,
                pageContent: content,
                metadata: {}
            }
        })

        return docs
    }
}

class Oxylabs_DocumentLoaders implements INode {
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
        this.label = 'Oxylabs'
        this.name = 'oxylabs'
        this.type = 'Document'
        this.icon = 'oxylabs.svg'
        this.version = 1.0
        this.category = 'Document Loaders'
        this.description = 'Extract data from URLs using Oxylabs'
        this.baseClasses = [this.type]
        this.credential = {
            label: 'Oxylabs API',
            name: 'credential',
            type: 'credential',
            credentialNames: ['oxylabsApi']
        }
        this.inputs = [
            {
                label: 'Text Splitter',
                name: 'textSplitter',
                type: 'TextSplitter',
                optional: false
            },
            {
                label: 'Query',
                name: 'query',
                type: 'string',
                description: 'Website URL of query keyword.'
            },
            {
                label: 'Source',
                name: 'source',
                type: 'options',
                description: 'Target website to scrape.',
                options: [
                    {
                        label: 'Universal',
                        name: 'universal'
                    },
                    {
                        label: 'Google Search',
                        name: 'google_search'
                    },
                    {
                        label: 'Amazon Product',
                        name: 'amazon_product'
                    },
                    {
                        label: 'Amazon Search',
                        name: 'amazon_search'
                    }
                ],
                default: 'universal'
            },
            {
                label: 'Geolocation',
                name: 'geo_location',
                type: 'string',
                description: "Sets the proxy's geo location to retrieve data. Check Oxylabs documentation for more details.",
                optional: true
            },
            {
                label: 'Render',
                name: 'render',
                type: 'boolean',
                description: 'Enables JavaScript rendering when set to true.',
                optional: true,
                default: false
            },
            {
                label: 'Parse',
                name: 'parse',
                type: 'boolean',
                description:
                    "Returns parsed data when set to true, as long as a dedicated parser exists for the submitted URL's page type.",
                optional: true,
                default: false
            },
            {
                label: 'User Agent Type',
                name: 'user_agent_type',
                type: 'options',
                description: 'Device type and browser.',
                options: [
                    {
                        label: 'Desktop',
                        name: 'desktop'
                    },
                    {
                        label: 'Desktop Chrome',
                        name: 'desktop_chrome'
                    },
                    {
                        label: 'Desktop Edge',
                        name: 'desktop_edge'
                    },
                    {
                        label: 'Desktop Firefox',
                        name: 'desktop_firefox'
                    },
                    {
                        label: 'Desktop Opera',
                        name: 'desktop_opera'
                    },
                    {
                        label: 'Desktop Safari',
                        name: 'desktop_safari'
                    },
                    {
                        label: 'Mobile',
                        name: 'mobile'
                    },
                    {
                        label: 'Mobile Android',
                        name: 'mobile_android'
                    },
                    {
                        label: 'Mobile iOS',
                        name: 'mobile_ios'
                    },
                    {
                        label: 'Tablet',
                        name: 'tablet'
                    },
                    {
                        label: 'Tablet Android',
                        name: 'tablet_android'
                    },
                    {
                        label: 'Tablet iOS',
                        name: 'tablet_ios'
                    }
                ],
                optional: true
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
        const query = nodeData.inputs?.query as string
        const textSplitter = nodeData.inputs?.textSplitter as TextSplitter
        const source = nodeData.inputs?.source as string
        const geo_location = nodeData.inputs?.geo_location as string
        const render = nodeData.inputs?.render as boolean
        const parse = nodeData.inputs?.parse as boolean
        const user_agent_type = nodeData.inputs?.user_agent_type as string

        const credentialData = await getCredentialData(nodeData.credential ?? '', options)
        const username = getCredentialParam('username', credentialData, nodeData)
        const password = getCredentialParam('password', credentialData, nodeData)

        const output = nodeData.outputs?.output as string

        const input: OxylabsLoaderParameters = {
            username,
            password,
            query,
            source,
            geo_location,
            render,
            parse,
            user_agent_type
        }

        const loader = new OxylabsLoader(input)

        let docs: OxylabsDocument[] = await loader.load()

        if (textSplitter && docs.length > 0) {
            docs = await textSplitter.splitDocuments(docs)
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

module.exports = { nodeClass: Oxylabs_DocumentLoaders }
