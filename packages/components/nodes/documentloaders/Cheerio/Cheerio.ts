import { SelectorType } from 'cheerio'
import { parse } from 'css-what'
import { CheerioWebBaseLoader, WebBaseLoaderParams } from 'langchain/document_loaders/web/cheerio'
import { TextSplitter } from 'langchain/text_splitter'
import { test } from 'linkifyjs'
import { webCrawl, xmlScrape } from '../../../src'
import { INode, INodeData, INodeParams } from '../../../src/Interface'

class Cheerio_DocumentLoaders implements INode {
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
        this.label = 'Cheerio Web Scraper'
        this.name = 'cheerioWebScraper'
        this.version = 1.1
        this.type = 'Document'
        this.icon = 'cheerio.svg'
        this.category = 'Document Loaders'
        this.description = `Load data from webpages`
        this.baseClasses = [this.type]
        this.inputs = [
            {
                label: 'URL',
                name: 'url',
                type: 'string'
            },
            {
                label: 'Text Splitter',
                name: 'textSplitter',
                type: 'TextSplitter',
                optional: true
            },
            {
                label: 'Get Relative Links Method',
                name: 'relativeLinksMethod',
                type: 'options',
                description: 'Select a method to retrieve relative links',
                options: [
                    {
                        label: 'Web Crawl',
                        name: 'webCrawl',
                        description: 'Crawl relative links from HTML URL'
                    },
                    {
                        label: 'Scrape XML Sitemap',
                        name: 'scrapeXMLSitemap',
                        description: 'Scrape relative links from XML sitemap URL'
                    }
                ],
                optional: true,
                additionalParams: true
            },
            {
                label: 'Get Relative Links Limit',
                name: 'limit',
                type: 'number',
                optional: true,
                additionalParams: true,
                description:
                    'Only used when "Get Relative Links Method" is selected. Set 0 to retrieve all relative links, default limit is 10.',
                warning: `Retrieving all links might take long time, and all links will be upserted again if the flow's state changed (eg: different URL, chunk size, etc)`
            },
            {
                label: 'Selector (CSS)',
                name: 'selector',
                type: 'string',
                description: 'Specify a CSS selector to select the content to be extracted',
                optional: true,
                additionalParams: true
            },
            {
                label: 'Base URL Prefixes',
                name: 'urlFilter',
                type: 'string',
                description: 'Delimited by comma. If specified, only links that start with this URL will be retrieved. (Web Crawl only)',
                optional: true,
                additionalParams: true
            },
            {
                label: 'Excluded URL Prefixes',
                name: 'exUrlFilter',
                type: 'string',
                description:
                    "Delimited by comma. If specified, only links that don't start with this URL will be retrieved. (Web Crawl only)",
                optional: true,
                additionalParams: true
            },
            {
                label: 'Metadata',
                name: 'metadata',
                type: 'json',
                optional: true,
                additionalParams: true
            }
        ]
    }

    async init(nodeData: INodeData): Promise<any> {
        const textSplitter = nodeData.inputs?.textSplitter as TextSplitter
        const metadata = nodeData.inputs?.metadata
        const relativeLinksMethod = nodeData.inputs?.relativeLinksMethod as string
        let limit = nodeData.inputs?.limit as string

        let url = nodeData.inputs?.url as string
        url = url.trim()
        if (!test(url)) {
            throw new Error('Invalid URL')
        }

        const selector: SelectorType = nodeData.inputs?.selector as SelectorType

        let params: WebBaseLoaderParams = {}
        if (selector) {
            parse(selector) // comes with cheerio - will throw error if invalid
            params['selector'] = selector
        }

        const baseUrlFilters = ((nodeData.inputs?.urlFilter as string)?.trim()?.toLowerCase() || '').split(',').filter((x) => !!x)
        const exBaseUrlFilter = ((nodeData.inputs?.exUrlFilter as string)?.trim()?.toLowerCase() || '').split(',').filter((x) => !!x)

        console.info(`Prefix urls: ${baseUrlFilters.join(',')}`)
        console.info(`Excluded urls: ${exBaseUrlFilter.join(',')}`)

        async function cheerioLoader(url: string): Promise<any[]> {
            try {
                let docs = [] as any[]
                if (!!baseUrlFilters && !baseUrlFilters.some((baseUrl) => url.toLowerCase().startsWith(baseUrl))) {
                    console.info(`scraping - skipping url ${url} because it does not start with ${baseUrlFilters}`)
                    return docs
                }

                if (!!exBaseUrlFilter && exBaseUrlFilter.some((exBaseUrl) => url.toLowerCase().startsWith(exBaseUrl))) {
                    console.info(`scraping - skipping url ${url} because it starts with ${exBaseUrlFilter}`)
                    return docs
                }

                const loader = new CheerioWebBaseLoader(url, params)
                console.info(`scraping - loading url ${url}`)
                if (textSplitter) {
                    docs = await loader.loadAndSplit(textSplitter)
                } else {
                    docs = await loader.load()
                }
                console.info(`scraping - loaded ${docs.length} docs from ${url}`)
                return docs
            } catch (err) {
                console.error(`error in CheerioWebBaseLoader: ${err.message}, on page: ${url}`)
                return []
            }
        }

        let docs = []
        if (relativeLinksMethod) {
            if (process.env.DEBUG === 'true') console.info(`Start ${relativeLinksMethod}`)
            if (!limit) limit = '10'
            else if (parseInt(limit) < 0) throw new Error('Limit cannot be less than 0')
            console.info(`scrape limit: ${limit}`)
            console.info(`scraping url: ${url}`)
            let pages: string[] =
                relativeLinksMethod === 'webCrawl'
                    ? await webCrawl(url, parseInt(limit), baseUrlFilters, exBaseUrlFilter)
                    : await xmlScrape(url, parseInt(limit))

            if (process.env.DEBUG === 'true') console.info(`pages: ${JSON.stringify(pages)}, length: ${pages.length}`)
            if (!pages || !Array.isArray(pages) || pages.length === 0) {
                console.warn(`No relative links found for ${url}`)
                return
            }

            if (!!limit && parseInt(limit) > 0) {
                console.info(`scraping limit to ${limit}`)
                pages = pages.slice(0, parseInt(limit)) // limit docs to be returned
            }

            try {
                console.info(`scraping found ${pages.length} pages: ${pages.join(', ')}`)
                for (const page of pages) {
                    docs.push(...(await cheerioLoader(page)))
                }
            } catch (err) {
                console.error(`error in CheerioWebBaseLoader: ${err.message}, on page: ${url}`)
            }

            if (process.env.DEBUG === 'true') console.info(`Finish ${relativeLinksMethod}`)
        } else {
            docs = await cheerioLoader(url)
        }

        if (metadata) {
            const parsedMetadata = typeof metadata === 'object' ? metadata : JSON.parse(metadata)
            let finaldocs = []

            for (const doc of docs) {
                const newdoc = {
                    ...doc,
                    metadata: {
                        ...doc.metadata,
                        ...parsedMetadata
                    }
                }
                finaldocs.push(newdoc)
            }
            return finaldocs
        }

        console.info(`scraped ${docs.length} docs from ${url}`)
        if (!!limit && parseInt(limit) > 0 && docs.length > parseInt(limit)) {
            console.info(`scraped docs limiting to ${limit}`)
            docs = docs.slice(0, parseInt(limit)) // limit docs to be returned
        }

        return docs
    }
}

module.exports = { nodeClass: Cheerio_DocumentLoaders }
