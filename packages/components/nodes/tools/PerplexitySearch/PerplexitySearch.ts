import { Tool } from '@langchain/core/tools'
import { ICommonObject, INode, INodeData, INodeParams } from '../../../src/Interface'
import { getBaseClasses, getCredentialData, getCredentialParam } from '../../../src/utils'

const DESC = `Search the web using the Perplexity Search API. Input should be a search query. Returns ranked web search results with titles, URLs, and snippets.`

class PerplexitySearchTool extends Tool {
    static lc_name() {
        return 'PerplexitySearchTool'
    }

    name = 'perplexity_search'
    description = DESC
    private apiKey: string
    private maxResults: number
    private searchRecencyFilter?: string
    private searchDomainFilter?: string[]

    constructor(fields: {
        apiKey: string
        description?: string
        maxResults?: number
        searchRecencyFilter?: string
        searchDomainFilter?: string[]
    }) {
        super()
        this.apiKey = fields.apiKey
        if (fields.description) this.description = fields.description
        this.maxResults = fields.maxResults ?? 5
        this.searchRecencyFilter = fields.searchRecencyFilter
        this.searchDomainFilter = fields.searchDomainFilter
    }

    async _call(query: string): Promise<string> {
        const body: Record<string, any> = {
            query,
            max_results: this.maxResults
        }
        if (this.searchRecencyFilter) body.search_recency_filter = this.searchRecencyFilter
        if (this.searchDomainFilter && this.searchDomainFilter.length > 0) body.search_domain_filter = this.searchDomainFilter

        const response = await fetch('https://api.perplexity.ai/search', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${this.apiKey}`
            },
            body: JSON.stringify(body)
        })

        if (!response.ok) {
            const errorBody = await response.text().catch(() => '')
            throw new Error(`Perplexity Search API error: ${response.status} ${response.statusText}${errorBody ? ` - ${errorBody}` : ''}`)
        }

        const data = await response.json()
        return JSON.stringify(data.results ?? data)
    }
}

class PerplexitySearch_Tools implements INode {
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
        this.label = 'Perplexity Search'
        this.name = 'perplexitySearch'
        this.version = 1.0
        this.type = 'PerplexitySearch'
        this.icon = 'perplexity.svg'
        this.category = 'Tools'
        this.description = 'Wrapper around Perplexity Search API - returns ranked web search results'
        this.inputs = [
            {
                label: 'Tool Description',
                name: 'description',
                type: 'string',
                description: 'Description of what the tool does. This is for the LLM to determine when to use this tool.',
                rows: 4,
                additionalParams: true,
                default: DESC
            },
            {
                label: 'Max Results',
                name: 'maxResults',
                type: 'number',
                step: 1,
                default: 5,
                optional: true,
                additionalParams: true,
                description: 'Maximum number of search results to return.'
            },
            {
                label: 'Recency Filter',
                name: 'searchRecencyFilter',
                type: 'options',
                options: [
                    { label: 'None', name: '' },
                    { label: 'Day', name: 'day' },
                    { label: 'Week', name: 'week' },
                    { label: 'Month', name: 'month' },
                    { label: 'Year', name: 'year' }
                ],
                optional: true,
                additionalParams: true,
                description: 'Filter results by recency.'
            },
            {
                label: 'Domain Filter',
                name: 'searchDomainFilter',
                type: 'string',
                optional: true,
                additionalParams: true,
                placeholder: 'example.com,another.com',
                description:
                    'Comma-separated list of domains to filter results. Prefix with - to exclude (e.g. -reddit.com). Do not mix allowlist and denylist entries.'
            }
        ]
        this.credential = {
            label: 'Connect Credential',
            name: 'credential',
            type: 'credential',
            credentialNames: ['perplexityApi']
        }
        this.baseClasses = [this.type, ...getBaseClasses(PerplexitySearchTool)]
    }

    async init(nodeData: INodeData, _: string, options: ICommonObject): Promise<any> {
        const description = nodeData.inputs?.description as string
        const maxResults = nodeData.inputs?.maxResults as string
        const searchRecencyFilter = nodeData.inputs?.searchRecencyFilter as string
        const searchDomainFilter = nodeData.inputs?.searchDomainFilter as string

        const credentialData = await getCredentialData(nodeData.credential ?? '', options)
        const perplexityApiKey = getCredentialParam('perplexityApiKey', credentialData, nodeData)

        if (!perplexityApiKey) {
            throw new Error('Perplexity API Key missing from credential')
        }

        return new PerplexitySearchTool({
            apiKey: perplexityApiKey,
            description: description || undefined,
            maxResults: maxResults ? parseInt(maxResults, 10) : undefined,
            searchRecencyFilter: searchRecencyFilter || undefined,
            searchDomainFilter: searchDomainFilter?.trim()
                ? searchDomainFilter
                      .split(',')
                      .map((s) => s.trim())
                      .filter(Boolean)
                : undefined
        })
    }
}

module.exports = { nodeClass: PerplexitySearch_Tools }