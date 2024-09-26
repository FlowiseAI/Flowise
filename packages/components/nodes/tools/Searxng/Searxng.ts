import { Tool } from '@langchain/core/tools'
import { INode, INodeData, INodeParams } from '../../../src/Interface'
import { getBaseClasses } from '../../../src/utils'

interface SearxngResults {
    query: string
    number_of_results: number
    results: Array<{
        url: string
        title: string
        content: string
        img_src: string
        engine: string
        parsed_url: Array<string>
        template: string
        engines: Array<string>
        positions: Array<number>
        score: number
        category: string
        pretty_url: string
        open_group?: boolean
        close_group?: boolean
    }>
    answers: Array<string>
    corrections: Array<string>
    infoboxes: Array<{
        infobox: string
        content: string
        engine: string
        engines: Array<string>
    }>
    suggestions: Array<string>
    unresponsive_engines: Array<string>
}

interface SearxngCustomHeaders {
    [key: string]: string
}

interface SearxngSearchParams {
    numResults?: number
    categories?: string
    engines?: string
    language?: string
    pageNumber?: number
    timeRange?: number
    format?: string
    resultsOnNewTab?: 0 | 1
    imageProxy?: boolean
    autocomplete?: string
    safesearch?: 0 | 1 | 2
}

class Searxng_Tools implements INode {
    label: string
    name: string
    version: number
    description: string
    type: string
    icon: string
    category: string
    baseClasses: string[]
    inputs: INodeParams[]

    constructor() {
        this.label = 'SearXNG'
        this.name = 'searXNG'
        this.version = 2.0
        this.type = 'SearXNG'
        this.icon = 'SearXNG.svg'
        this.category = 'Tools'
        this.description = 'Wrapper around SearXNG - a free internet metasearch engine'
        this.inputs = [
            {
                label: 'Base URL',
                name: 'apiBase',
                type: 'string',
                default: 'http://searxng:8080'
            },
            {
                label: 'Headers',
                name: 'headers',
                type: 'json',
                description: 'Custom headers for the request',
                optional: true,
                additionalParams: true
            },
            {
                label: 'Format',
                name: 'format',
                type: 'options',
                options: [
                    {
                        label: 'JSON',
                        name: 'json'
                    },
                    {
                        label: 'HTML',
                        name: 'html'
                    }
                ],
                default: 'json',
                description:
                    'Format of the response. You need to enable search formats in settings.yml. Refer to <a target="_blank" href="https://docs.flowiseai.com/integrations/langchain/tools/searchapi">SearXNG Setup Guide</a> for more details.',
                additionalParams: true
            },
            {
                label: 'Categories',
                name: 'categories',
                description:
                    'Comma separated list, specifies the active search categories. (see <a target="_blank" href="https://docs.searxng.org/user/configured_engines.html#configured-engines">Configured Engines</a>)',
                optional: true,
                additionalParams: true,
                type: 'string'
            },
            {
                label: 'Engines',
                name: 'engines',
                description:
                    'Comma separated list, specifies the active search engines. (see <a target="_blank" href="https://docs.searxng.org/user/configured_engines.html#configured-engines">Configured Engines</a>)',
                optional: true,
                additionalParams: true,
                type: 'string'
            },
            {
                label: 'Language',
                name: 'language',
                description: 'Code of the language.',
                optional: true,
                additionalParams: true,
                type: 'string'
            },
            {
                label: 'Page No.',
                name: 'pageno',
                description: 'Search page number.',
                optional: true,
                additionalParams: true,
                type: 'number'
            },
            {
                label: 'Time Range',
                name: 'time_range',
                description:
                    'Time range of search for engines which support it. See if an engine supports time range search in the preferences page of an instance.',
                optional: true,
                additionalParams: true,
                type: 'string'
            },
            {
                label: 'Safe Search',
                name: 'safesearch',
                description:
                    'Filter search results of engines which support safe search. See if an engine supports safe search in the preferences page of an instance.',
                optional: true,
                additionalParams: true,
                type: 'number'
            }
        ]
        this.baseClasses = [this.type, ...getBaseClasses(SearxngSearch)]
    }

    async init(nodeData: INodeData, _: string): Promise<any> {
        const apiBase = nodeData.inputs?.apiBase as string
        const headers = nodeData.inputs?.headers as string
        const categories = nodeData.inputs?.categories as string
        const engines = nodeData.inputs?.engines as string
        const language = nodeData.inputs?.language as string
        const pageno = nodeData.inputs?.pageno as string
        const time_range = nodeData.inputs?.time_range as string
        const safesearch = nodeData.inputs?.safesearch as 0 | 1 | 2 | undefined
        const format = nodeData.inputs?.format as string

        const params: SearxngSearchParams = {}

        if (categories) params.categories = categories
        if (engines) params.engines = engines
        if (language) params.language = language
        if (pageno) params.pageNumber = parseFloat(pageno)
        if (time_range) params.timeRange = parseFloat(time_range)
        if (safesearch) params.safesearch = safesearch
        if (format) params.format = format

        let customHeaders = undefined
        if (headers) {
            customHeaders = typeof headers === 'string' ? JSON.parse(headers) : headers
        }

        const tool = new SearxngSearch({
            apiBase,
            params,
            headers: customHeaders
        })

        return tool
    }
}

class SearxngSearch extends Tool {
    static lc_name() {
        return 'SearxngSearch'
    }

    name = 'searxng-search'

    description =
        'A meta search engine. Useful for when you need to answer questions about current events. Input should be a search query. Output is a JSON array of the query results'

    protected apiBase?: string

    protected params?: SearxngSearchParams = {
        numResults: 10,
        pageNumber: 1,
        imageProxy: true,
        safesearch: 0
    }

    protected headers?: SearxngCustomHeaders

    get lc_secrets(): { [key: string]: string } | undefined {
        return {
            apiBase: 'SEARXNG_API_BASE'
        }
    }

    constructor({ apiBase, params, headers }: { apiBase?: string; params?: SearxngSearchParams; headers?: SearxngCustomHeaders }) {
        super(...arguments)

        this.apiBase = apiBase
        this.headers = { 'content-type': 'application/json', ...headers }

        if (!this.apiBase) {
            throw new Error(`SEARXNG_API_BASE not set. You can set it as "SEARXNG_API_BASE" in your environment variables.`)
        }

        if (params) {
            this.params = { ...this.params, ...params }
        }
    }

    protected buildUrl<P extends SearxngSearchParams>(path: string, parameters: P, baseUrl: string): string {
        const nonUndefinedParams: [string, string][] = Object.entries(parameters)
            .filter(([_, value]) => value !== undefined)
            .map(([key, value]) => [key, value.toString()]) // Avoid string conversion
        const searchParams = new URLSearchParams(nonUndefinedParams)
        return `${baseUrl}/${path}?${searchParams}`
    }

    async _call(input: string): Promise<string> {
        const queryParams = {
            q: input,
            ...this.params
        }
        const url = this.buildUrl('search', queryParams, this.apiBase as string)

        const resp = await fetch(url, {
            method: 'POST',
            headers: this.headers,
            signal: AbortSignal.timeout(5 * 1000) // 5 seconds
        })

        if (!resp.ok) {
            throw new Error(resp.statusText)
        }

        const res: SearxngResults = await resp.json()

        if (!res.results.length && !res.answers.length && !res.infoboxes.length && !res.suggestions.length) {
            return 'No good results found.'
        } else if (res.results.length) {
            const response: string[] = []

            res.results.forEach((r) => {
                response.push(
                    JSON.stringify({
                        title: r.title || '',
                        link: r.url || '',
                        snippet: r.content || ''
                    })
                )
            })

            return response.slice(0, this.params?.numResults).toString()
        } else if (res.answers.length) {
            return res.answers[0]
        } else if (res.infoboxes.length) {
            return res.infoboxes[0]?.content.replaceAll(/<[^>]+>/gi, '')
        } else if (res.suggestions.length) {
            let suggestions = 'Suggestions: '
            res.suggestions.forEach((s) => {
                suggestions += `${s}, `
            })
            return suggestions
        } else {
            return 'No good results found.'
        }
    }
}

module.exports = { nodeClass: Searxng_Tools }
