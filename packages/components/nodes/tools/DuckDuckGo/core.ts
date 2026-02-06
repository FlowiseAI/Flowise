import { Tool } from '@langchain/core/tools'

export interface DuckDuckGoSearchParams {
    maxResults?: number
}

export class DuckDuckGoSearch extends Tool {
    name = 'duckduckgo-search'
    description = 'Useful for when you need to search the internet for current information. Input should be a search query string. Returns relevant search results from DuckDuckGo. This tool does not require an API key.'

    private maxResults: number

    constructor(params?: DuckDuckGoSearchParams) {
        super()
        this.maxResults = params?.maxResults ?? 4
    }

    async _call(input: string): Promise<string> {
        try {
            const results = await this.fetchSearchResults(input)
            if (!results || results.length === 0) {
                return 'No results found.'
            }
            return JSON.stringify(results)
        } catch (error) {
            return `Error performing search: ${(error as Error).message}`
        }
    }

    private async fetchSearchResults(query: string): Promise<{ title: string; link: string; snippet: string }[]> {
        // DuckDuckGo HTML lite endpoint - no API key required
        const url = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`

        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            }
        })

        if (!response.ok) {
            throw new Error(`DuckDuckGo search failed with status ${response.status}`)
        }

        const html = await response.text()
        return this.parseResults(html)
    }

    private parseResults(html: string): { title: string; link: string; snippet: string }[] {
        const results: { title: string; link: string; snippet: string }[] = []

        // Parse result blocks from DDG HTML lite
        const resultBlocks = html.split('class="result__body"')

        for (let i = 1; i < resultBlocks.length && results.length < this.maxResults; i++) {
            const block = resultBlocks[i]

            // Extract title
            const titleMatch = block.match(/class="result__a"[^>]*>([^<]+)</)
            const title = titleMatch ? this.decodeHtmlEntities(titleMatch[1].trim()) : ''

            // Extract URL
            const urlMatch = block.match(/class="result__url"[^>]*href="([^"]*)"/)
            let link = ''
            if (urlMatch) {
                link = urlMatch[1]
                // DDG uses redirect URLs, extract the actual URL
                const uddgMatch = link.match(/uddg=([^&]+)/)
                if (uddgMatch) {
                    link = decodeURIComponent(uddgMatch[1])
                }
            }

            // Extract snippet
            const snippetMatch = block.match(/class="result__snippet"[^>]*>([\s\S]*?)<\/a>/)
            const snippet = snippetMatch ? this.stripHtmlTags(this.decodeHtmlEntities(snippetMatch[1].trim())) : ''

            if (title && link) {
                results.push({ title, link, snippet })
            }
        }

        return results
    }

    private stripHtmlTags(str: string): string {
        return str.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim()
    }

    private decodeHtmlEntities(str: string): string {
        return str
            .replace(/&amp;/g, '&')
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
            .replace(/&quot;/g, '"')
            .replace(/&#39;/g, "'")
            .replace(/&#x27;/g, "'")
            .replace(/&#x2F;/g, '/')
    }
}
