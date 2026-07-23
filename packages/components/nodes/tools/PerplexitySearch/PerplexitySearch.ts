import { ICommonObject, INode, INodeData, INodeParams } from '../../../src/Interface'
import { getBaseClasses, getCredentialData, getCredentialParam } from '../../../src/utils'
import { desc, PerplexitySearchParameters, PerplexitySearchTool } from './core'

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
        this.description = "Wrapper around Perplexity's Search API for ranked web results"
        this.inputs = [
            {
                label: 'Tool Description',
                name: 'description',
                type: 'string',
                rows: 4,
                additionalParams: true,
                optional: true,
                default: desc,
                description: 'Description of what the tool does. This is for the LLM to determine when to use this tool.'
            },
            {
                label: 'Max Results',
                name: 'maxResults',
                type: 'number',
                step: 1,
                default: 5,
                additionalParams: true,
                optional: true,
                description: 'Maximum number of search results to return. Default is 5.'
            },
            {
                label: 'Search Domain Filter',
                name: 'searchDomainFilter',
                type: 'string',
                rows: 2,
                additionalParams: true,
                optional: true,
                description:
                    'Comma-separated list of domains to restrict results to. Prefix a domain with - to exclude it (e.g. "nytimes.com,-pinterest.com"). Do not mix allow and deny entries.'
            },
            {
                label: 'Search Recency Filter',
                name: 'searchRecencyFilter',
                type: 'options',
                options: [
                    { label: 'Hour', name: 'hour' },
                    { label: 'Day', name: 'day' },
                    { label: 'Week', name: 'week' },
                    { label: 'Month', name: 'month' },
                    { label: 'Year', name: 'year' }
                ],
                additionalParams: true,
                optional: true,
                description: 'Filter search results to a relative time window.'
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
        const maxResults = nodeData.inputs?.maxResults as string | number | undefined
        const searchDomainFilter = nodeData.inputs?.searchDomainFilter as string
        const searchRecencyFilter = nodeData.inputs?.searchRecencyFilter as string

        const credentialData = await getCredentialData(nodeData.credential ?? '', options)
        const perplexityApiKey = getCredentialParam('perplexityApiKey', credentialData, nodeData)

        if (!perplexityApiKey) {
            throw new Error('Perplexity API Key missing from credential')
        }

        const params: PerplexitySearchParameters = {
            apiKey: perplexityApiKey
        }

        if (description) params.description = description

        if (maxResults !== undefined && maxResults !== '') {
            const parsed = typeof maxResults === 'number' ? maxResults : parseInt(maxResults as string, 10)
            if (!isNaN(parsed) && parsed > 0) params.maxResults = parsed
        }

        if (searchDomainFilter) {
            const domains = searchDomainFilter
                .split(',')
                .map((d) => d.trim())
                .filter((d) => d.length > 0)
            if (domains.length > 0) params.searchDomainFilter = domains
        }

        if (searchRecencyFilter) {
            params.searchRecencyFilter = searchRecencyFilter as PerplexitySearchParameters['searchRecencyFilter']
        }

        return new PerplexitySearchTool(params)
    }
}

module.exports = { nodeClass: PerplexitySearch_Tools }
