import { z } from 'zod/v3'
import fetch from 'node-fetch'
import { DynamicStructuredTool } from '../OpenAPIToolkit/core'

export const desc = `A wrapper around Perplexity's Search API. Useful for retrieving up-to-date, ranked web results with title, URL, and snippet for a given query.`

export interface PerplexitySearchParameters {
    apiKey: string
    maxResults?: number
    searchDomainFilter?: string[]
    searchRecencyFilter?: 'hour' | 'day' | 'week' | 'month' | 'year'
    name?: string
    description?: string
}

interface PerplexitySearchResult {
    title?: string
    url?: string
    snippet?: string
    date?: string
}

const createPerplexitySearchSchema = () => {
    return z.object({
        query: z.string().describe('The search query to send to the Perplexity Search API.')
    })
}

export class PerplexitySearchTool extends DynamicStructuredTool {
    apiKey: string
    maxResults: number
    searchDomainFilter?: string[]
    searchRecencyFilter?: 'hour' | 'day' | 'week' | 'month' | 'year'

    constructor(args: PerplexitySearchParameters) {
        const schema = createPerplexitySearchSchema()

        const toolInput = {
            name: args.name || 'perplexity_search',
            description: args.description || desc,
            schema: schema,
            baseUrl: '',
            method: 'POST',
            headers: {}
        }
        super(toolInput)
        this.apiKey = args.apiKey
        this.maxResults = args.maxResults ?? 5
        this.searchDomainFilter = args.searchDomainFilter
        this.searchRecencyFilter = args.searchRecencyFilter
    }

    private buildBody(query: string): Record<string, any> {
        const body: Record<string, any> = {
            query,
            max_results: this.maxResults
        }
        if (this.searchDomainFilter && this.searchDomainFilter.length > 0) {
            body.search_domain_filter = this.searchDomainFilter
        }
        if (this.searchRecencyFilter) {
            body.search_recency_filter = this.searchRecencyFilter
        }
        return body
    }

    /** @ignore */
    async _call(arg: any): Promise<string> {
        const { query } = arg

        if (!query) {
            throw new Error('Query is required for Perplexity Search')
        }

        if (!this.apiKey) {
            throw new Error('Perplexity API Key is required')
        }

        const response = await fetch('https://api.perplexity.ai/search', {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${this.apiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(this.buildBody(query))
        })

        if (!response.ok) {
            const errorText = await response.text().catch(() => '')
            throw new Error(`Perplexity Search API error: ${response.status} ${response.statusText}${errorText ? ` - ${errorText}` : ''}`)
        }

        const data = (await response.json()) as { results?: PerplexitySearchResult[] }
        const results = data.results || []

        if (results.length === 0) {
            return 'No Perplexity Search results were found.'
        }

        const formatted = results
            .map((result, index) => {
                const title = result.title || 'Untitled'
                const url = result.url || ''
                const snippet = result.snippet || ''
                const date = result.date ? `\nDate: ${result.date}` : ''
                return `${index + 1}. ${title}\nURL: ${url}${date}\nSnippet: ${snippet}`
            })
            .join('\n\n')

        return formatted
    }
}
