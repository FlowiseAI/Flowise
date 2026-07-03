import axios from 'axios'
import { Tool } from '@langchain/core/tools'
import { ICommonObject, INode, INodeData, INodeParams } from '../../../src/Interface'
import { getBaseClasses, getCredentialData, getCredentialParam } from '../../../src/utils'

interface ScavioSearchParams {
    apiKey: string
    searchType?: string
    countryCode?: string
    language?: string
    device?: string
    lightRequest?: boolean
    page?: number
}

class ScavioSearchTool extends Tool {
    name = 'scavio_search'
    description =
        'Real-time web search via Scavio. Input should be a plain search query string. Returns Google results (title, url, description) as JSON.'

    apiKey: string
    searchType?: string
    countryCode?: string
    language?: string
    device?: string
    lightRequest?: boolean
    page?: number

    constructor(fields: ScavioSearchParams) {
        super()
        this.apiKey = fields.apiKey
        this.searchType = fields.searchType
        this.countryCode = fields.countryCode
        this.language = fields.language
        this.device = fields.device
        this.lightRequest = fields.lightRequest
        this.page = fields.page
    }

    async _call(input: string): Promise<string> {
        const body: Record<string, any> = { query: input }
        if (this.searchType) body.search_type = this.searchType
        if (this.countryCode) body.country_code = this.countryCode
        if (this.language) body.language = this.language
        if (this.device) body.device = this.device
        if (this.lightRequest !== undefined) body.light_request = this.lightRequest
        if (this.page) body.page = this.page

        try {
            const { data } = await axios.post('https://api.scavio.dev/api/v2/google', body, {
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${this.apiKey}`
                }
            })
            const results = Array.isArray(data?.organic_results) ? data.organic_results : []
            if (!results.length) return JSON.stringify(data).slice(0, 4000)
            return JSON.stringify(
                results.map((r: any) => ({ title: r.title, url: r.link, description: r.snippet })),
                null,
                2
            )
        } catch (error: any) {
            const status = error?.response?.status
            const detail = error?.response?.data ? JSON.stringify(error.response.data) : error?.message
            return `Scavio API error${status ? ` (${status})` : ''}: ${detail}`
        }
    }
}

class Scavio_Tools implements INode {
    label: string
    name: string
    version: number
    description: string
    type: string
    icon: string
    category: string
    baseClasses: string[]
    credential: INodeParams
    inputs: INodeParams[]

    constructor() {
        this.label = 'Scavio'
        this.name = 'scavioAPI'
        this.version = 1.0
        this.type = 'Scavio'
        this.icon = 'scavio.svg'
        this.category = 'Tools'
        this.description =
            'Real-time search API for AI agents - Google, YouTube, Amazon, Walmart, Reddit, TikTok, and Instagram as clean JSON'
        this.inputs = [
            {
                label: 'Search Type',
                name: 'searchType',
                type: 'options',
                options: [
                    { label: 'Classic', name: 'classic' },
                    { label: 'News', name: 'news' },
                    { label: 'Images', name: 'images' }
                ],
                default: 'classic',
                description: 'Google search vertical',
                additionalParams: true,
                optional: true
            },
            {
                label: 'Country Code',
                name: 'countryCode',
                type: 'string',
                placeholder: 'us',
                description: 'Two-letter country code, e.g. us',
                additionalParams: true,
                optional: true
            },
            {
                label: 'Language',
                name: 'language',
                type: 'string',
                placeholder: 'en',
                description: 'Two-letter language code, e.g. en',
                additionalParams: true,
                optional: true
            },
            {
                label: 'Device',
                name: 'device',
                type: 'options',
                options: [
                    { label: 'Desktop', name: 'desktop' },
                    { label: 'Mobile', name: 'mobile' }
                ],
                default: 'desktop',
                additionalParams: true,
                optional: true
            },
            {
                label: 'Light Request',
                name: 'lightRequest',
                type: 'boolean',
                default: true,
                description: 'Cheaper, lighter response (1 credit instead of 2)',
                additionalParams: true,
                optional: true
            },
            {
                label: 'Page',
                name: 'page',
                type: 'number',
                default: 1,
                description: 'Result page number (1-based)',
                additionalParams: true,
                optional: true
            }
        ]
        this.credential = {
            label: 'Connect Credential',
            name: 'credential',
            type: 'credential',
            credentialNames: ['scavioApi']
        }
        this.baseClasses = [this.type, ...getBaseClasses(Tool)]
    }

    async init(nodeData: INodeData, _: string, options: ICommonObject): Promise<any> {
        const credentialData = await getCredentialData(nodeData.credential ?? '', options)
        const scavioApiKey = getCredentialParam('scavioApiKey', credentialData, nodeData)

        const searchType = nodeData.inputs?.searchType as string
        const countryCode = nodeData.inputs?.countryCode as string
        const language = nodeData.inputs?.language as string
        const device = nodeData.inputs?.device as string
        const lightRequest = nodeData.inputs?.lightRequest as boolean
        const page = nodeData.inputs?.page as number

        return new ScavioSearchTool({
            apiKey: scavioApiKey,
            searchType,
            countryCode,
            language,
            device,
            lightRequest,
            page
        })
    }
}

module.exports = { nodeClass: Scavio_Tools }
