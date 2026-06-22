import fetch from 'node-fetch'
import { Tool } from '@langchain/core/tools'

export const SERPER_ENDPOINTS = ['search', 'news', 'images', 'videos', 'places', 'maps', 'shopping', 'scholar', 'patents', 'autocomplete', 'scrape'] as const
export type SerperEndpoint = (typeof SERPER_ENDPOINTS)[number]

export interface SerperConfig {
    apiKey: string
    endpoint: SerperEndpoint
    gl?: string
    hl?: string
    num?: number
    page?: number
    autocorrect?: boolean
    tbs?: string
    location?: string
    imgar?: string
    imgtype?: string
    ll?: string
}

const ENDPOINT_DESCRIPTIONS: Record<SerperEndpoint, string> = {
    search: 'Search the web using Google Search. Input should be a search query string.',
    news: 'Search Google News for recent news articles and headlines. Input should be a search query string.',
    images: 'Search Google Images for pictures. Input should be a search query string describing what images to find.',
    videos: 'Search Google Videos for video content. Input should be a search query string.',
    places: 'Search Google Places for local businesses, restaurants, and points of interest. Input should be a location or business type query.',
    maps: 'Search Google Maps for locations and businesses on a map. Input should be a location or business query.',
    shopping: 'Search Google Shopping for products and prices. Input should be a product name or description.',
    scholar: 'Search Google Scholar for academic papers and research. Input should be a research topic or paper title.',
    patents: 'Search Google Patents for patent filings. Input should be a patent topic or invention description.',
    autocomplete: 'Get Google search autocomplete suggestions for a partial query. Input should be a partial search query.',
    scrape: 'Extract and return the full text content of a webpage. Input must be a complete URL starting with https:// or http://.'
}

const RESULT_KEY_MAP: Partial<Record<SerperEndpoint, string>> = {
    news: 'news',
    images: 'images',
    videos: 'videos',
    places: 'places',
    maps: 'places',
    shopping: 'shopping',
    scholar: 'organic',
    patents: 'organic',
    search: 'organic'
}

export class SerperTool extends Tool {
    static lc_name() {
        return 'SerperTool'
    }

    name: string
    description: string
    private config: SerperConfig

    constructor(config: SerperConfig) {
        super()
        this.config = config
        this.name = `serper_${config.endpoint}`
        this.description = ENDPOINT_DESCRIPTIONS[config.endpoint]
    }

    async _call(input: string): Promise<string> {
        try {
            if (this.config.endpoint === 'scrape') {
                return await this._scrape(input.trim())
            }
            return await this._search(input.trim())
        } catch (error: any) {
            throw new Error(`Serper API error (${this.config.endpoint}): ${error.message}`)
        }
    }

    private async _search(query: string): Promise<string> {
        const { apiKey, endpoint, gl, hl, num, page, autocorrect, tbs, location, imgar, imgtype, ll } = this.config

        const body: Record<string, any> = { q: query }
        if (gl) body.gl = gl
        if (hl) body.hl = hl
        if (num !== undefined && num > 0) body.num = num
        if (page !== undefined && page > 1) body.page = page
        if (autocorrect !== undefined) body.autocorrect = autocorrect
        if (tbs) body.tbs = tbs
        if (location) body.location = location
        if (imgar) body.imgar = imgar
        if (imgtype) body.imgtype = imgtype
        if (ll) body.ll = ll

        const res = await fetch(`https://google.serper.dev/${endpoint}`, {
            method: 'POST',
            headers: {
                'X-API-KEY': apiKey,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(body)
        })

        if (!res.ok) {
            const errorText = await res.text().catch(() => res.statusText)
            throw new Error(`HTTP ${res.status}: ${errorText}`)
        }

        const json: any = await res.json()
        return this._parseSearchResponse(json)
    }

    private async _scrape(url: string): Promise<string> {
        const res = await fetch('https://scrape.serper.dev', {
            method: 'POST',
            headers: {
                'X-API-KEY': this.config.apiKey,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ url })
        })

        if (!res.ok) {
            const errorText = await res.text().catch(() => res.statusText)
            throw new Error(`HTTP ${res.status}: ${errorText}`)
        }

        const json: any = await res.json()

        if (json.text) return json.text
        if (json.metadata?.title) return `${json.metadata.title}\n\n${JSON.stringify(json)}`
        return JSON.stringify(json)
    }

    private _parseSearchResponse(json: any): string {
        const endpoint = this.config.endpoint

        if (json.suggestions && Array.isArray(json.suggestions)) {
            return json.suggestions.map((s: any) => s.value || s).join('\n')
        }

        if (json.answerBox) {
            if (json.answerBox.answer) return json.answerBox.answer
            if (json.answerBox.snippet) return json.answerBox.snippet
            if (json.answerBox.snippet_highlighted_words?.length) return json.answerBox.snippet_highlighted_words[0]
        }

        if (json.sportsResults?.game_spotlight) return json.sportsResults.game_spotlight

        if (json.knowledgeGraph?.description) return json.knowledgeGraph.description

        const resultKey = RESULT_KEY_MAP[endpoint]
        if (resultKey && json[resultKey] && Array.isArray(json[resultKey]) && json[resultKey].length > 0) {
            return this._formatResultArray(json[resultKey], endpoint)
        }

        return JSON.stringify(json)
    }

    private _formatResultArray(results: any[], endpoint: SerperEndpoint): string {
        return results
            .map((r: any, i: number) => {
                const parts: string[] = [`[${i + 1}]`]

                if (r.title) parts.push(r.title)
                if (r.snippet) parts.push(`- ${r.snippet}`)
                if (r.link || r.website) parts.push(`URL: ${r.link || r.website}`)
                if (r.date) parts.push(`Date: ${r.date}`)
                if (r.source) parts.push(`Source: ${r.source}`)

                if (r.imageUrl) parts.push(`Image: ${r.imageUrl}`)
                if (r.imageWidth && r.imageHeight) parts.push(`(${r.imageWidth}x${r.imageHeight})`)

                if (r.duration) parts.push(`Duration: ${r.duration}`)
                if (r.channel) parts.push(`Channel: ${r.channel}`)

                if (r.address) parts.push(`Address: ${r.address}`)
                if (r.rating !== undefined) parts.push(`Rating: ${r.rating}${r.ratingCount ? ` (${r.ratingCount} reviews)` : ''}`)
                if (r.phoneNumber) parts.push(`Phone: ${r.phoneNumber}`)
                if (r.category || r.type) parts.push(`Category: ${r.category || r.type}`)

                if (r.price) parts.push(`Price: ${r.price}`)
                if (r.delivery) parts.push(`Delivery: ${r.delivery}`)

                if (r.publicationInfo) parts.push(`Publication: ${r.publicationInfo}`)
                if (r.citedBy !== undefined) parts.push(`Cited by: ${r.citedBy}`)

                if (r.priorityDate) parts.push(`Priority Date: ${r.priorityDate}`)
                if (r.inventor) parts.push(`Inventor: ${r.inventor}`)
                if (r.assignee) parts.push(`Assignee: ${r.assignee}`)

                return parts.join(' ')
            })
            .join('\n\n')
    }
}
