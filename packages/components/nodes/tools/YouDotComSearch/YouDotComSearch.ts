import { DynamicStructuredTool } from '@langchain/core/tools'
import { ICommonObject, INode, INodeData, INodeParams } from '../../../src/Interface'
import { getBaseClasses, getCredentialData, getCredentialParam } from '../../../src/utils'
import { youSearch } from '@youdotcom-oss/langchain'

class YouDotComSearch_Tools implements INode {
    label: string
    name: string
    version: number
    description: string
    type: string
    icon: string
    category: string
    author: string
    baseClasses: string[]
    credential: INodeParams
    inputs: INodeParams[]

    constructor() {
        this.label = 'You.com Search'
        this.name = 'youDotComSearch'
        this.version = 1.0
        this.type = 'YouDotComSearch'
        this.icon = 'Youcom_logo.jpg'
        this.category = 'Tools'
        this.author = 'You.com'
        this.description = 'Real-time web search powered by You.com — returns titles, URLs, and snippets'
        this.credential = {
            label: 'Connect Credential',
            name: 'credential',
            type: 'credential',
            credentialNames: ['youDotComApi']
        }
        this.inputs = [
            {
                label: 'Count',
                name: 'count',
                type: 'number',
                optional: true,
                additionalParams: true,
                description: 'Number of search results to return'
            },
            {
                label: 'Freshness',
                name: 'freshness',
                type: 'string',
                optional: true,
                additionalParams: true,
                description: 'Filter by recency — accepts relative dates like "Day", "Week", "Month", or ISO date ranges'
            },
            {
                label: 'Country',
                name: 'country',
                type: 'options',
                options: [
                    { label: 'Argentina', name: 'AR' },
                    { label: 'Australia', name: 'AU' },
                    { label: 'Austria', name: 'AT' },
                    { label: 'Belgium', name: 'BE' },
                    { label: 'Brazil', name: 'BR' },
                    { label: 'Brazil (PT-BR)', name: 'PT-BR' },
                    { label: 'Canada', name: 'CA' },
                    { label: 'Chile', name: 'CL' },
                    { label: 'China', name: 'CN' },
                    { label: 'Denmark', name: 'DK' },
                    { label: 'Finland', name: 'FI' },
                    { label: 'France', name: 'FR' },
                    { label: 'Germany', name: 'DE' },
                    { label: 'Hong Kong', name: 'HK' },
                    { label: 'India', name: 'IN' },
                    { label: 'Indonesia', name: 'ID' },
                    { label: 'Italy', name: 'IT' },
                    { label: 'Japan', name: 'JP' },
                    { label: 'Malaysia', name: 'MY' },
                    { label: 'Mexico', name: 'MX' },
                    { label: 'Netherlands', name: 'NL' },
                    { label: 'New Zealand', name: 'NZ' },
                    { label: 'Norway', name: 'NO' },
                    { label: 'Philippines', name: 'PH' },
                    { label: 'Poland', name: 'PL' },
                    { label: 'Portugal', name: 'PT' },
                    { label: 'Russia', name: 'RU' },
                    { label: 'Saudi Arabia', name: 'SA' },
                    { label: 'South Africa', name: 'ZA' },
                    { label: 'South Korea', name: 'KR' },
                    { label: 'Spain', name: 'ES' },
                    { label: 'Sweden', name: 'SE' },
                    { label: 'Switzerland', name: 'CH' },
                    { label: 'Taiwan', name: 'TW' },
                    { label: 'Turkey', name: 'TR' },
                    { label: 'United Kingdom', name: 'GB' },
                    { label: 'United States', name: 'US' }
                ],
                optional: true,
                additionalParams: true,
                description: 'Filter search results by country'
            },
            {
                label: 'Safe Search',
                name: 'safesearch',
                type: 'options',
                options: [
                    { label: 'Off', name: 'off' },
                    { label: 'Moderate', name: 'moderate' },
                    { label: 'Strict', name: 'strict' }
                ],
                default: 'moderate',
                optional: true,
                additionalParams: true,
                description: 'Safe search filtering level'
            },
            {
                label: 'Live Crawl',
                name: 'livecrawl',
                type: 'options',
                options: [
                    { label: 'Web', name: 'web' },
                    { label: 'News', name: 'news' },
                    { label: 'All', name: 'all' }
                ],
                optional: true,
                additionalParams: true,
                description: 'Enable live crawling for the freshest results'
            },
            {
                label: 'Live Crawl Format',
                name: 'livecrawl_formats',
                type: 'options',
                options: [
                    { label: 'Markdown', name: 'markdown' },
                    { label: 'HTML', name: 'html' }
                ],
                optional: true,
                additionalParams: true,
                description: 'Format for live crawled page content'
            }
        ]
        this.baseClasses = [this.type, 'Tool', ...getBaseClasses(DynamicStructuredTool)]
    }

    async init(nodeData: INodeData, _: string, options: ICommonObject): Promise<any> {
        const credentialData = await getCredentialData(nodeData.credential ?? '', options)
        const apiKey = getCredentialParam('ydcApiKey', credentialData, nodeData)

        const config: Record<string, any> = { apiKey }

        for (const { name } of this.inputs) {
            const value = nodeData.inputs?.[name]
            if (value !== undefined && value !== null && value !== '') config[name] = value
        }

        return youSearch(config)
    }
}

module.exports = { nodeClass: YouDotComSearch_Tools }
