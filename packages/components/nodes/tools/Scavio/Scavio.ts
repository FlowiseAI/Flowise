import { Tool } from '@langchain/core/tools'
import { ICommonObject, INode, INodeData, INodeParams } from '../../../src/Interface'
import { getBaseClasses, getCredentialData, getCredentialParam } from '../../../src/utils'
import { secureAxiosRequest } from '../../../src/httpSecurity'

interface ScavioSearchParams {
    apiKey: string
    gl?: string
    hl?: string
    googleDomain?: string
    location?: string
    device?: string
    page?: number
}

class ScavioSearchTool extends Tool {
    name = 'scavio_search'
    description =
        'Real-time web search via Scavio. Input should be a plain search query string. Returns Google results (title, url, description) as JSON.'

    apiKey: string
    gl?: string
    hl?: string
    googleDomain?: string
    location?: string
    device?: string
    page?: number

    constructor(fields: ScavioSearchParams) {
        super()
        this.apiKey = fields.apiKey
        this.gl = fields.gl
        this.hl = fields.hl
        this.googleDomain = fields.googleDomain
        this.location = fields.location
        this.device = fields.device
        this.page = fields.page
    }

    async _call(input: string): Promise<string> {
        const body: Record<string, any> = { query: input }
        if (this.gl) body.gl = this.gl
        if (this.hl) body.hl = this.hl
        if (this.googleDomain) body.google_domain = this.googleDomain
        if (this.location) body.location = this.location
        if (this.device) body.device = this.device
        if (this.page && this.page > 1) body.start = (this.page - 1) * 10

        try {
            const response = await secureAxiosRequest({
                method: 'POST',
                url: 'https://api.scavio.dev/api/v2/google',
                data: body,
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${this.apiKey}`
                }
            })
            if (response.status >= 400) {
                return `Scavio API error (${response.status}): ${JSON.stringify(response.data).slice(0, 2000)}`
            }
            const data = response.data
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
                label: 'Country Code',
                name: 'gl',
                type: 'string',
                placeholder: 'us',
                description: 'Two-letter country code (ISO 3166-1 alpha-2), e.g. us',
                additionalParams: true,
                optional: true
            },
            {
                label: 'Language',
                name: 'hl',
                type: 'string',
                placeholder: 'en',
                description: 'Two-letter language code, e.g. en',
                additionalParams: true,
                optional: true
            },
            {
                label: 'Google Domain',
                name: 'googleDomain',
                type: 'string',
                placeholder: 'google.com',
                description: 'Google domain to use, e.g. google.com',
                additionalParams: true,
                optional: true
            },
            {
                label: 'Location',
                name: 'location',
                type: 'string',
                placeholder: 'Austin, Texas, United States',
                description: 'Canonical location string to originate the search from',
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
        if (!scavioApiKey) {
            throw new Error('Scavio API Key is missing. Please connect your Scavio API credential.')
        }

        const gl = nodeData.inputs?.gl as string
        const hl = nodeData.inputs?.hl as string
        const googleDomain = nodeData.inputs?.googleDomain as string
        const location = nodeData.inputs?.location as string
        const device = nodeData.inputs?.device as string
        const page = nodeData.inputs?.page as number

        return new ScavioSearchTool({
            apiKey: scavioApiKey,
            gl,
            hl,
            googleDomain,
            location,
            device,
            page
        })
    }
}

module.exports = { nodeClass: Scavio_Tools }
