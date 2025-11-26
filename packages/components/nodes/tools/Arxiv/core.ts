import { z } from 'zod'
import fetch from 'node-fetch'
import { PDFLoader } from '@langchain/community/document_loaders/fs/pdf'
import { DynamicStructuredTool } from '../OpenAPIToolkit/core'

export const desc = `Use this tool to search for academic papers on Arxiv. You can search by keywords, topics, authors, or specific Arxiv IDs. The tool can return either paper summaries or download and extract full paper content.`

export interface ArxivParameters {
    topKResults?: number
    maxQueryLength?: number
    docContentCharsMax?: number
    loadFullContent?: boolean
    continueOnFailure?: boolean
    legacyBuild?: boolean
    name?: string
    description?: string
}

interface ArxivResult {
    id: string
    title: string
    authors: string[]
    summary: string
    published: string
    updated: string
    entryId: string
}

// Schema for Arxiv search
const createArxivSchema = () => {
    return z.object({
        query: z
            .string()
            .describe('Search query for Arxiv papers. Can be keywords, topics, authors, or specific Arxiv IDs (e.g., 2301.12345)')
    })
}

export class ArxivTool extends DynamicStructuredTool {
    topKResults = 3
    maxQueryLength = 300
    docContentCharsMax = 4000
    loadFullContent = false
    continueOnFailure = false
    legacyBuild = false
    logger?: any
    orgId?: string

    constructor(args?: ArxivParameters, logger?: any, orgId?: string) {
        const schema = createArxivSchema()

        const toolInput = {
            name: args?.name || 'arxiv_search',
            description: args?.description || desc,
            schema: schema,
            baseUrl: '',
            method: 'GET',
            headers: {}
        }
        super(toolInput)
        this.topKResults = args?.topKResults ?? this.topKResults
        this.maxQueryLength = args?.maxQueryLength ?? this.maxQueryLength
        this.docContentCharsMax = args?.docContentCharsMax ?? this.docContentCharsMax
        this.loadFullContent = args?.loadFullContent ?? this.loadFullContent
        this.continueOnFailure = args?.continueOnFailure ?? this.continueOnFailure
        this.legacyBuild = args?.legacyBuild ?? this.legacyBuild
        this.logger = logger
        this.orgId = orgId
    }

    private isArxivIdentifier(query: string): boolean {
        const arxivIdentifierPattern = /\d{2}(0[1-9]|1[0-2])\.\d{4,5}(v\d+|)|\d{7}.*/
        const queryItems = query.substring(0, this.maxQueryLength).split(/\s+/)

        for (const queryItem of queryItems) {
            const match = queryItem.match(arxivIdentifierPattern)
            if (!match || match[0] !== queryItem) {
                return false
            }
        }
        return true
    }

    private parseArxivResponse(xmlText: string): ArxivResult[] {
        const results: ArxivResult[] = []

        // Simple XML parsing for Arxiv API response
        const entryRegex = /<entry>(.*?)<\/entry>/gs
        const entries = xmlText.match(entryRegex) || []

        for (const entry of entries) {
            try {
                const id = this.extractXmlValue(entry, 'id')
                const title = this.extractXmlValue(entry, 'title')?.replace(/\n\s+/g, ' ').trim()
                const summary = this.extractXmlValue(entry, 'summary')?.replace(/\n\s+/g, ' ').trim()
                const published = this.extractXmlValue(entry, 'published')
                const updated = this.extractXmlValue(entry, 'updated')

                // Extract authors
                const authorRegex = /<author><name>(.*?)<\/name><\/author>/g
                const authors: string[] = []
                let authorMatch
                while ((authorMatch = authorRegex.exec(entry)) !== null) {
                    authors.push(authorMatch[1])
                }

                if (id && title && summary) {
                    results.push({
                        id,
                        title,
                        authors,
                        summary,
                        published: published || '',
                        updated: updated || '',
                        entryId: id
                    })
                }
            } catch (error) {
                console.warn('Error parsing Arxiv entry:', error)
            }
        }

        return results
    }

    private extractXmlValue(xml: string, tag: string): string | undefined {
        const regex = new RegExp(`<${tag}[^>]*>(.*?)</${tag}>`, 's')
        const match = xml.match(regex)
        return match ? match[1] : undefined
    }

    private async fetchResults(query: string): Promise<ArxivResult[]> {
        const baseUrl = 'http://export.arxiv.org/api/query'
        let searchParams: URLSearchParams

        if (this.isArxivIdentifier(query)) {
            // Search by ID
            const ids = query.split(/\s+/).join(',')
            searchParams = new URLSearchParams({
                id_list: ids,
                max_results: this.topKResults.toString()
            })
        } else {
            // Search by query
            // Remove problematic characters that can cause search issues
            const cleanedQuery = query.replace(/[:-]/g, '').substring(0, this.maxQueryLength)
            searchParams = new URLSearchParams({
                search_query: `all:${cleanedQuery}`,
                max_results: this.topKResults.toString(),
                sortBy: 'relevance',
                sortOrder: 'descending'
            })
        }

        const url = `${baseUrl}?${searchParams.toString()}`
        this.logger?.info(`[${this.orgId}]: Making Arxiv API call to: ${url}`)

        const response = await fetch(url)
        if (!response.ok) {
            throw new Error(`Arxiv API error: ${response.status} ${response.statusText}`)
        }

        const xmlText = await response.text()
        return this.parseArxivResponse(xmlText)
    }

    private async downloadAndExtractPdf(arxivId: string): Promise<string> {
        // Extract clean arxiv ID from full URL if needed
        const cleanId = arxivId.replace('http://arxiv.org/abs/', '').replace('https://arxiv.org/abs/', '')
        const pdfUrl = `https://arxiv.org/pdf/${cleanId}.pdf`

        this.logger?.info(`[${this.orgId}]: Downloading PDF from: ${pdfUrl}`)

        const response = await fetch(pdfUrl)
        if (!response.ok) {
            throw new Error(`Failed to download PDF: ${response.status} ${response.statusText}`)
        }

        // Get PDF buffer and create blob
        const buffer = await response.buffer()
        const blob = new Blob([buffer])

        // Use PDFLoader to extract text (same as Pdf.ts)
        const loader = new PDFLoader(blob, {
            splitPages: false,
            pdfjs: () =>
                // @ts-ignore
                this.legacyBuild ? import('pdfjs-dist/legacy/build/pdf.js') : import('pdf-parse/lib/pdf.js/v1.10.100/build/pdf.js')
        })

        const docs = await loader.load()
        return docs.map((doc) => doc.pageContent).join('\n')
    }

    /** @ignore */
    async _call(arg: any): Promise<string> {
        const { query } = arg

        if (!query) {
            throw new Error('Query is required for Arxiv search')
        }

        try {
            const results = await this.fetchResults(query)

            if (results.length === 0) {
                return 'No good Arxiv Result was found'
            }

            if (!this.loadFullContent) {
                // Return summaries only (original behavior)
                const docs = results.map((result) => {
                    const publishedDate = result.published ? new Date(result.published).toISOString().split('T')[0] : 'Unknown'
                    return `Published: ${publishedDate}\nTitle: ${result.title}\nAuthors: ${result.authors.join(', ')}\nSummary: ${
                        result.summary
                    }`
                })

                const fullText = docs.join('\n\n')
                return this.docContentCharsMax ? fullText.substring(0, this.docContentCharsMax) : fullText
            } else {
                // Download PDFs and extract full content
                const docs: string[] = []

                for (const result of results) {
                    try {
                        this.logger?.info(`[${this.orgId}]: Processing paper: ${result.title}`)

                        // Download and extract PDF content
                        const fullText = await this.downloadAndExtractPdf(result.id)

                        const publishedDate = result.published ? new Date(result.published).toISOString().split('T')[0] : 'Unknown'

                        // Format with metadata and full content
                        const docContent = `Published: ${publishedDate}\nTitle: ${result.title}\nAuthors: ${result.authors.join(
                            ', '
                        )}\nSummary: ${result.summary}\n\nFull Content:\n${fullText}`

                        const truncatedContent = this.docContentCharsMax ? docContent.substring(0, this.docContentCharsMax) : docContent

                        docs.push(truncatedContent)
                    } catch (error) {
                        const errorMessage = error instanceof Error ? error.message : 'Unknown error'
                        console.error(`Error processing paper ${result.title}:`, errorMessage)

                        if (!this.continueOnFailure) {
                            throw new Error(`Failed to process paper "${result.title}": ${errorMessage}`)
                        } else {
                            // Add error notice and continue with summary only
                            const publishedDate = result.published ? new Date(result.published).toISOString().split('T')[0] : 'Unknown'
                            const fallbackContent = `Published: ${publishedDate}\nTitle: ${result.title}\nAuthors: ${result.authors.join(
                                ', '
                            )}\nSummary: ${result.summary}\n\n[ERROR: Could not load full content - ${errorMessage}]`
                            docs.push(fallbackContent)
                        }
                    }
                }

                return docs.join('\n\n---\n\n')
            }
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error'
            console.error('Arxiv search error:', errorMessage)
            throw new Error(`Failed to search Arxiv: ${errorMessage}`)
        }
    }
}
