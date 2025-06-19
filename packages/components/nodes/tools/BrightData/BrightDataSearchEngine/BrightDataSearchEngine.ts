import { Tool } from '@langchain/core/tools'
import { ICommonObject, INode, INodeData, INodeParams } from '../../../../src/Interface'
import { getBaseClasses, getCredentialData, getCredentialParam } from '../../../../src/utils'
import axios from 'axios'

class BrightDataSearchEngineTool extends Tool {
    name = 'brightdata_search_engine'
    description = 'Search the web using Bright Data Web Unlocker with support for Google, Bing, and Yandex search engines. Returns SERP results in markdown format with URLs, titles, and descriptions. Supports pagination.'

    constructor(
        private apiToken: string,
        private searchEngine: string = 'google',
        private maxResults: number = 10,
        private timeoutMs: number = 60000,
        private zone: string = 'mcp_unlocker'
    ) {
        super()
    }

    private getApiHeaders() {
        return {
            'authorization': `Bearer ${this.apiToken}`,
            'user-agent': 'flowise-brightdata/1.0.0',
            'Content-Type': 'application/json'
        }
    }

    private buildSearchUrl(query: string, engine: string, cursor?: string): string {
        const encodedQuery = encodeURIComponent(query)
        const page = cursor ? parseInt(cursor) : 0
        const start = page * 10

        switch (engine.toLowerCase()) {
            case 'yandex':
                return `https://yandex.com/search/?text=${encodedQuery}&p=${page}`
            case 'bing':
                return `https://www.bing.com/search?q=${encodedQuery}&first=${start + 1}`
            case 'google':
            default:
                return `https://www.google.com/search?q=${encodedQuery}&start=${start}`
        }
    }

    private calculatePagination(maxResults: number): { pages: number; cursor?: string } {
        const resultsPerPage = 10
        const pages = Math.ceil(maxResults / resultsPerPage)
        return { pages, cursor: pages > 1 ? String(pages - 1) : undefined }
    }

    async _call(input: string): Promise<string> {
        try {
            console.log('[BrightData Search] Tool called with input:', input)
            
            const query = input.trim()
            if (!query) {
                const errorMsg = 'No search query provided. Please specify a search term.'
                console.error('[BrightData Search] Error:', errorMsg)
                return `Error: ${errorMsg}`
            }

            console.log(`[BrightData Search] Searching for: "${query}" using ${this.searchEngine}`)
            console.log(`[BrightData Search] Max results: ${this.maxResults}`)

            const { pages } = this.calculatePagination(this.maxResults)
            let allResults: string[] = []

            // Perform searches for each page needed
            for (let page = 0; page < pages; page++) {
                try {
                    const cursor = page > 0 ? String(page) : undefined
                    const searchUrl = this.buildSearchUrl(query, this.searchEngine, cursor)
                    
                    console.log(`[BrightData Search] Page ${page + 1}/${pages} - URL: ${searchUrl}`)

                    const requestData = {
                        url: searchUrl,
                        zone: this.zone,
                        format: 'raw',
                        data_format: 'markdown'
                    }

                    console.log('[BrightData Search] Request data:', requestData)

                    const response = await axios({
                        url: 'https://api.brightdata.com/request',
                        method: 'POST',
                        data: requestData,
                        headers: this.getApiHeaders(),
                        responseType: 'text',
                        timeout: this.timeoutMs
                    })

                    console.log(`[BrightData Search] Page ${page + 1} response status: ${response.status}`)
                    console.log(`[BrightData Search] Page ${page + 1} content length: ${response.data?.length || 0} characters`)

                    if (response.data && typeof response.data === 'string') {
                        allResults.push(`## Page ${page + 1} Results\n\n${response.data}`)
                    } else {
                        console.warn(`[BrightData Search] Page ${page + 1} returned no data`)
                    }

                    // Add small delay between requests to avoid rate limiting
                    if (page < pages - 1) {
                        await new Promise(resolve => setTimeout(resolve, 1000))
                    }

                } catch (pageError: any) {
                    console.error(`[BrightData Search] Error on page ${page + 1}:`, pageError.message)
                    
                    // Continue with other pages even if one fails
                    const errorMsg = `Page ${page + 1} failed: ${pageError.message}`
                    allResults.push(`## Page ${page + 1} Error\n\n${errorMsg}`)
                }
            }

            if (allResults.length === 0) {
                const errorMsg = 'No search results could be retrieved.'
                console.error('[BrightData Search] Error:', errorMsg)
                return `Error: ${errorMsg}`
            }

            // Combine all results
            const combinedResults = [
                `# Search Results for "${query}"`,
                `**Search Engine:** ${this.searchEngine}`,
                `**Pages Retrieved:** ${allResults.length}/${pages}`,
                `**Requested Results:** ${this.maxResults}`,
                '',
                ...allResults
            ].join('\n')

            console.log(`[BrightData Search] Success! Total content length: ${combinedResults.length} characters`)
            return combinedResults

        } catch (error: any) {
            console.error('[BrightData Search] Exception occurred:', error)
            
            if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
                const errorMsg = `Search timeout after ${this.timeoutMs / 1000} seconds.`
                console.error('[BrightData Search] Timeout error:', errorMsg)
                return `Error: ${errorMsg}`
            }
            
            if (error.response) {
                const statusCode = error.response.status
                const statusText = error.response.statusText
                const errorData = error.response.data
                
                const errorMsg = `HTTP Error ${statusCode}: ${statusText}. ${errorData || ''}`.trim()
                console.error('[BrightData Search] HTTP error:', errorMsg)
                return `Error: ${errorMsg}`
            }

            const errorMsg = `Search failed: ${error.message || 'Unknown error occurred'}`
            console.error('[BrightData Search] General error:', errorMsg)
            return `Error: ${errorMsg}`
        }
    }
}

class BrightDataSearchEngine_Tools implements INode {
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
        this.label = 'Bright Data Search Engine'
        this.name = 'brightDataSearchEngine'
        this.version = 1.0
        this.type = 'BrightDataSearchEngine'
        this.icon = 'brightdata-search.svg'
        this.category = 'Tools'
        this.description = 'Search the web using Bright Data Web Unlocker with support for multiple search engines and bot detection bypass'
        this.baseClasses = [this.type, ...getBaseClasses(BrightDataSearchEngineTool)]
        
        this.credential = {
            label: 'Connect Credential',
            name: 'credential',
            type: 'credential',
            credentialNames: ['brightDataApi']
        }
        
        this.inputs = [
            {
                label: 'Search Engine',
                name: 'searchEngine',
                type: 'options',
                options: [
                    { label: 'Google', name: 'google' },
                    { label: 'Bing', name: 'bing' },
                    { label: 'Yandex', name: 'yandex' }
                ],
                default: 'google',
                description: 'Search engine to use for web searches.',
                optional: true
            },
            {
                label: 'Max Results',
                name: 'maxResults',
                type: 'number',
                description: 'Maximum number of search results to retrieve (10 results per page).',
                placeholder: '10',
                default: 10,
                optional: true
            },
            {
                label: 'Timeout (seconds)',
                name: 'timeoutS',
                type: 'number',
                description: 'Maximum time in seconds to wait for each search request.',
                placeholder: '60',
                default: 60,
                optional: true,
                additionalParams: true
            },
            {
                label: 'Zone Name',
                name: 'zone',
                type: 'string',
                description: 'Bright Data zone name to use. Leave empty to use default zone.',
                placeholder: 'mcp_unlocker',
                optional: true,
                additionalParams: true
            },
            {
                label: 'Tool Description',
                name: 'description',
                type: 'string',
                description: 'Custom description of what the tool does. This helps the LLM understand when to use this tool.',
                rows: 3,
                additionalParams: true,
                optional: true,
                placeholder: 'Search the web using Bright Data Web Unlocker with support for multiple search engines and bot detection bypass.'
            }
        ]
    }

    async init(nodeData: INodeData, _: string, options: ICommonObject): Promise<any> {
        try {
            console.log('[BrightData Search] Initializing Search Engine tool...')
            
            const credentialData = await getCredentialData(nodeData.credential ?? '', options)
            const apiToken = getCredentialParam('brightDataApiToken', credentialData, nodeData)
            
            if (!apiToken) {
                throw new Error('Bright Data API token is required but not found in credentials')
            }

            console.log('[BrightData Search] API token found, length:', apiToken.length)
            
            const searchEngine = nodeData.inputs?.searchEngine as string || 'google'
            const maxResults = nodeData.inputs?.maxResults as number || 10
            const timeoutS = nodeData.inputs?.timeoutS as number || 60
            const zone = nodeData.inputs?.zone as string || 'mcp_unlocker'
            const customDescription = nodeData.inputs?.description as string

            console.log('[BrightData Search] Configuration:', {
                searchEngine,
                maxResults,
                timeoutS,
                zone,
                hasCustomDescription: !!customDescription
            })

            const tool = new BrightDataSearchEngineTool(
                apiToken,
                searchEngine,
                maxResults,
                timeoutS * 1000,
                zone
            )

            if (customDescription) {
                tool.description = customDescription
            }

            console.log('[BrightData Search] Tool initialized successfully')
            return tool
            
        } catch (error) {
            console.error('[BrightData Search] Initialization error:', error)
            throw error
        }
    }
}

module.exports = { nodeClass: BrightDataSearchEngine_Tools }