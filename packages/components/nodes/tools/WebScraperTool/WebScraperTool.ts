import { INode, INodeParams, INodeData, ICommonObject } from '../../../src/Interface'
import { getBaseClasses } from '../../../src/utils'
import { Tool } from '@langchain/core/tools'
import fetch from 'node-fetch'
import * as cheerio from 'cheerio'
import { URL } from 'url'
import { xmlScrape } from '../../../src/utils'

interface ScrapedPageData {
    url: string
    title: string
    description: string
    body_text: string
    error?: string
}

class WebScraperRecursiveTool extends Tool {
    name = 'web_scraper_tool'
    description = `Scrapes web pages recursively or via default sitemap. Extracts title, description, and paragraph text. Input should be a single URL string. Returns a JSON string array of scraped page data objects.`

    private maxDepth: number
    private maxPages: number | null
    private timeoutMs: number
    private useSitemap: boolean
    private visitedUrls: Set<string>
    private scrapedPagesCount: number

    constructor(maxDepth: number = 1, maxPages: number | null = 10, timeoutMs: number = 60000, useSitemap: boolean = false) {
        super()

        this.maxDepth = Math.max(1, maxDepth)
        this.maxPages = maxPages !== null && maxPages > 0 ? maxPages : null
        this.timeoutMs = timeoutMs > 0 ? timeoutMs : 60000
        this.useSitemap = useSitemap
        this.visitedUrls = new Set<string>()
        this.scrapedPagesCount = 0

        let desc = ''
        if (this.useSitemap) {
            desc = `Scrapes URLs listed in the detected default sitemap (/sitemap.xml)`
            if (this.maxPages !== null) {
                desc += ` up to ${this.maxPages} pages`
            }
            desc += `, with a ${
                this.timeoutMs / 1000
            }-second timeout per page. Falls back to Recursive Link Following if sitemap is not found or empty.`
        } else {
            desc = `Recursively scrapes web pages starting from a given URL`
            if (this.maxDepth > 0) {
                desc += ` up to ${this.maxDepth} level(s) deep`
            }
            if (this.maxPages !== null) {
                desc += ` or until ${this.maxPages} pages are scraped`
            }
            desc += `, with a ${this.timeoutMs / 1000}-second timeout per page, whichever comes first.`
        }
        desc += ` Extracts title, description, and paragraph text. Input should be a single URL string. Returns a JSON string array of scraped page data.`
        this.description = desc
    }

    private async scrapeSingleUrl(url: string): Promise<Omit<ScrapedPageData, 'url'> & { foundLinks: string[] }> {
        try {
            const response = await fetch(url, { timeout: this.timeoutMs, redirect: 'follow', follow: 5 })
            if (!response.ok) {
                const errorText = await response.text()
                return {
                    title: '',
                    description: '',
                    body_text: '',
                    foundLinks: [],
                    error: `HTTP Error: ${response.status} ${response.statusText}. ${errorText}`
                }
            }
            const contentType = response.headers.get('content-type')

            if (contentType === null) {
                return {
                    title: '',
                    description: '',
                    body_text: '',
                    foundLinks: [],
                    error: `Skipped content due to missing Content-Type header`
                }
            }

            if (!contentType.includes('text/html') && url !== this.visitedUrls.values().next().value) {
                if (!contentType.includes('text/xml') && !contentType.includes('application/xml')) {
                    return {
                        title: '',
                        description: '',
                        body_text: '',
                        foundLinks: [],
                        error: `Skipped non-HTML/XML content (Content-Type: ${contentType})`
                    }
                }

                if (!contentType.includes('text/html')) {
                    return {
                        title: '',
                        description: '',
                        body_text: '',
                        foundLinks: [],
                        error: `Skipped non-HTML content (Content-Type: ${contentType})`
                    }
                }
            }

            const html = await response.text()
            const $ = cheerio.load(html)
            const title = $('title').first().text() || 'No title found'
            let description =
                $('meta[name="description"]').attr('content') ||
                $('meta[property="og:description"]').attr('content') ||
                $('meta[name="twitter:description"]').attr('content') ||
                'No description found'
            const paragraphs: string[] = []
            $('p').each((_i, elem) => {
                const paragraphText = $(elem).text()
                if (paragraphText) {
                    paragraphs.push(paragraphText.trim())
                }
            })
            const body_text = paragraphs.join(' ').replace(/\s\s+/g, ' ').trim()
            const foundLinks: string[] = []

            $('a').each((_i, elem) => {
                const href = $(elem).attr('href')
                if (href) {
                    try {
                        const absoluteUrl = new URL(href, url).toString()
                        if (absoluteUrl.startsWith('http') && !absoluteUrl.includes('#')) {
                            foundLinks.push(absoluteUrl)
                        }
                    } catch (e) {
                        // Ignore invalid URLs
                    }
                }
            })

            return {
                title: title.trim(),
                description: description.trim(),
                body_text: body_text,
                foundLinks: [...new Set(foundLinks)]
            }
        } catch (error: any) {
            if (error.type === 'request-timeout') {
                return {
                    title: '',
                    description: '',
                    body_text: '',
                    foundLinks: [],
                    error: `Scraping Error: Request Timeout after ${this.timeoutMs}ms`
                }
            }
            return {
                title: '',
                description: '',
                body_text: '',
                foundLinks: [],
                error: `Scraping Error: ${error?.message || 'Unknown error'}`
            }
        }
    }

    private async scrapeRecursive(url: string, currentDepth: number): Promise<ScrapedPageData[]> {
        if (this.maxPages !== null && this.scrapedPagesCount >= this.maxPages) {
            return []
        }
        if (currentDepth > this.maxDepth) {
            return []
        }
        if (this.visitedUrls.has(url)) {
            return []
        }
        try {
            new URL(url)
            if (!url.startsWith('http')) throw new Error('Invalid protocol')
        } catch (e) {
            if (this.maxPages !== null) {
                this.scrapedPagesCount++
            }
            return [{ url, title: '', description: '', body_text: '', error: `Invalid URL format or protocol` }]
        }
        this.visitedUrls.add(url)
        if (this.maxPages !== null) {
            this.scrapedPagesCount++
        }

        const { foundLinks, ...scrapedContent } = await this.scrapeSingleUrl(url)
        const currentPageData: ScrapedPageData = { url, ...scrapedContent }
        let results: ScrapedPageData[] = [currentPageData]

        if (!currentPageData.error && currentDepth < this.maxDepth && (this.maxPages === null || this.scrapedPagesCount < this.maxPages)) {
            const recursivePromises: Promise<ScrapedPageData[]>[] = []
            for (const link of foundLinks) {
                if (this.maxPages !== null && this.scrapedPagesCount >= this.maxPages) {
                    break
                }
                if (!this.visitedUrls.has(link)) {
                    recursivePromises.push(this.scrapeRecursive(link, currentDepth + 1))
                }
            }
            if (recursivePromises.length > 0) {
                const nestedResults = await Promise.all(recursivePromises)
                results = results.concat(...nestedResults)
            }
        } else if (currentPageData.error) {
            // Do nothing if there was an error scraping the current page
        }
        return results
    }

    private async scrapeUrlsFromList(urlList: string[]): Promise<ScrapedPageData[]> {
        const results: ScrapedPageData[] = []
        const scrapePromises: Promise<void>[] = []

        for (const url of urlList) {
            if (this.maxPages !== null && this.scrapedPagesCount >= this.maxPages) {
                break
            }
            if (this.visitedUrls.has(url)) {
                continue
            }

            this.visitedUrls.add(url)
            this.scrapedPagesCount++

            const promise = (async () => {
                const { foundLinks: _ignoreLinks, ...scrapedContent } = await this.scrapeSingleUrl(url)
                results.push({ url, ...scrapedContent })
            })()
            scrapePromises.push(promise)
        }

        await Promise.all(scrapePromises)

        return results.slice(0, this.maxPages ?? results.length)
    }

    async _call(initialInput: string): Promise<string> {
        this.visitedUrls = new Set<string>()
        this.scrapedPagesCount = 0
        let performedFallback = false
        let sitemapAttempted = false

        if (!initialInput || typeof initialInput !== 'string') {
            return JSON.stringify({ error: 'Input must be a single URL string.' })
        }

        try {
            let allScrapedData: ScrapedPageData[] = []
            let urlsFromSitemap: string[] = []

            if (this.useSitemap) {
                sitemapAttempted = true
                let sitemapUrlToFetch: string | undefined = undefined

                try {
                    const baseUrl = new URL(initialInput)
                    sitemapUrlToFetch = new URL('/sitemap.xml', baseUrl.origin).toString()
                } catch (e) {
                    return JSON.stringify({ error: 'Invalid initial URL provided for sitemap detection.' })
                }

                if (!sitemapUrlToFetch) {
                    return JSON.stringify({ error: 'Could not determine sitemap URL.' })
                }

                try {
                    const limitParam = this.maxPages === null ? Infinity : this.maxPages
                    urlsFromSitemap = await xmlScrape(sitemapUrlToFetch, limitParam)
                } catch (sitemapError) {
                    urlsFromSitemap = []
                }

                if (urlsFromSitemap.length > 0) {
                    allScrapedData = await this.scrapeUrlsFromList(urlsFromSitemap)
                } else {
                    performedFallback = true
                }
            }

            if (!sitemapAttempted || performedFallback) {
                allScrapedData = await this.scrapeRecursive(initialInput, 1)
            }

            if (this.maxPages !== null && this.scrapedPagesCount >= this.maxPages) {
                // Log or indicate that the max page limit was reached during scraping
            }

            if (performedFallback) {
                const warningResult = {
                    warning: 'Sitemap not found or empty; fell back to recursive scraping.',
                    scrapedData: allScrapedData
                }
                return JSON.stringify(warningResult)
            } else {
                return JSON.stringify(allScrapedData)
            }
        } catch (error: any) {
            return JSON.stringify({ error: `Failed scrape operation: ${error?.message || 'Unknown error'}` })
        }
    }
}

class WebScraperRecursive_Tools implements INode {
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
        this.label = 'Web Scraper Tool'
        this.name = 'webScraperTool'
        this.version = 1.1
        this.type = 'Tool'
        this.icon = 'webScraperTool.svg'
        this.category = 'Tools'
        this.description = 'Scrapes web pages recursively by following links OR by fetching URLs from the default sitemap.'
        this.baseClasses = [this.type, ...getBaseClasses(WebScraperRecursiveTool)]
        this.inputs = [
            {
                label: 'Scraping Mode',
                name: 'scrapeMode',
                type: 'options',
                options: [
                    { label: 'Recursive Link Following', name: 'recursive' },
                    { label: 'Sitemap', name: 'sitemap' }
                ],
                default: 'recursive',
                description:
                    "Select discovery method: 'Recursive' follows links found on pages (uses Max Depth). 'Sitemap' tries sitemap.xml first, but falls back to 'Recursive' if the sitemap is not found or empty.",
                additionalParams: true
            },
            {
                label: 'Max Depth',
                name: 'maxDepth',
                type: 'number',
                description:
                    'Maximum levels of links to follow (e.g., 1 = only the initial URL, 2 = initial URL + links found on it). Default 1.',
                placeholder: '1',
                default: 1,
                optional: true,
                additionalParams: true
            },
            {
                label: 'Max Pages',
                name: 'maxPages',
                type: 'number',
                description:
                    'Maximum total number of pages to scrape, regardless of mode or depth. Stops when this limit is reached. Leave empty for no page limit. Default: 10.',
                placeholder: '10',
                default: 10,
                optional: true,
                additionalParams: true
            },
            {
                label: 'Timeout (s)',
                name: 'timeoutS',
                type: 'number',
                description: 'Maximum time in seconds to wait for each page request to complete. Accepts decimals (e.g., 0.5). Default 60.',
                placeholder: '60',
                default: 60,
                optional: true,
                additionalParams: true
            },
            {
                label: 'Tool Description',
                name: 'description',
                type: 'string',
                description:
                    'Custom description of what the tool does. This is for LLM to determine when to use this tool. Overrides the default description.',
                rows: 4,
                additionalParams: true,
                optional: true,
                placeholder: `Scrapes web pages recursively or via default sitemap. Extracts title, description, and paragraph text. Input should be a single URL string. Returns a JSON string array of scraped page data objects.`
            }
        ]
    }

    async init(nodeData: INodeData, _: string, _options: ICommonObject): Promise<any> {
        const scrapeMode = (nodeData.inputs?.scrapeMode as string) ?? 'recursive'
        const useSitemap = scrapeMode === 'sitemap'

        const maxDepthInput = nodeData.inputs?.maxDepth as string | number | undefined
        let maxDepth = 1
        if (maxDepthInput !== undefined && maxDepthInput !== '') {
            const parsedDepth = parseInt(String(maxDepthInput), 10)
            if (!isNaN(parsedDepth) && parsedDepth > 0) {
                maxDepth = parsedDepth
            }
        }

        const maxPagesInput = nodeData.inputs?.maxPages as string | number | undefined
        let maxPages: number | null = 10
        if (maxPagesInput === undefined || maxPagesInput === '') {
            maxPages = null
        } else {
            const parsedPages = parseInt(String(maxPagesInput), 10)
            if (!isNaN(parsedPages) && parsedPages > 0) {
                maxPages = parsedPages
            } else if (parsedPages <= 0) {
                maxPages = null
            }
        }

        const timeoutInputS = nodeData.inputs?.timeoutS as string | number | undefined
        let timeoutMs = 60000
        if (timeoutInputS !== undefined && timeoutInputS !== '') {
            const parsedTimeoutS = parseFloat(String(timeoutInputS))
            if (!isNaN(parsedTimeoutS) && parsedTimeoutS > 0) {
                timeoutMs = Math.round(parsedTimeoutS * 1000)
            }
        }

        const customDescription = nodeData.inputs?.description as string

        const tool = new WebScraperRecursiveTool(maxDepth, maxPages, timeoutMs, useSitemap)

        if (customDescription) {
            tool.description = customDescription
        }

        return tool
    }
}

module.exports = { nodeClass: WebScraperRecursive_Tools }
