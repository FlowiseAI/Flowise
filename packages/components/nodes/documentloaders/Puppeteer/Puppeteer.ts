import { INode, INodeData, INodeParams } from '../../../src/Interface'
import { TextSplitter } from 'langchain/text_splitter'
import { PuppeteerWebBaseLoader } from 'langchain/document_loaders/web/puppeteer'
import { test } from 'linkifyjs'
import { webCrawl, xmlScrape } from '../../../src'

class Puppeteer_DocumentLoaders implements INode {
    label: string
    name: string
    description: string
    type: string
    icon: string
    category: string
    baseClasses: string[]
    inputs: INodeParams[]

    constructor() {
        this.label = 'Puppeteer Web Scraper'
        this.name = 'puppeteerWebScraper'
        this.type = 'Document'
        this.icon = 'puppeteer.svg'
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
                options: [
                    {
                        label: 'Web Crawl',
                        name: 'webCrawl'
                    },
                    {
                        label: 'Scrape XML Sitemap',
                        name: 'scrapeXMLSitemap'
                    }
                ],
                optional: true,
                additionalParams: true
            },
            {
                label: 'Crawl/Scrape Links Limit',
                name: 'limit',
                type: 'number',
                default: 10,
                optional: true,
                additionalParams: true,
                description: 'Set 0 to crawl/scrape all relative links',
                warning: `Scraping all links might take long time, and all links will be upserted again if the flow's state changed (eg: different URL, chunk size, etc) `
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

        async function puppeteerLoader(url: string): Promise<any> {
            try {
                let docs = []
                const loader = new PuppeteerWebBaseLoader(url)
                if (textSplitter) {
                    docs = await loader.loadAndSplit(textSplitter)
                } else {
                    docs = await loader.load()
                }
                return docs
            } catch (err) {
                if (process.env.DEBUG === 'true') console.error(`error in CheerioWebBaseLoader: ${err.message}, on page: ${url}`)
            }
        }

        let docs = []
        if (relativeLinksMethod) {
            if (process.env.DEBUG === 'true') console.info(`Start ${relativeLinksMethod}`)
            if (!limit) throw new Error('Please set a limit to crawl/scrape')
            else if (parseInt(limit) < 0) throw new Error('Limit cannot be less than 0')
            const pages: string[] =
                relativeLinksMethod === 'webCrawl' ? await webCrawl(url, parseInt(limit)) : await xmlScrape(url, parseInt(limit))
            if (process.env.DEBUG === 'true') console.info(`pages: ${JSON.stringify(pages)}, length: ${pages.length}`)
            if (!pages || pages.length === 0) throw new Error('No relative links found')
            for (const page of pages) {
                docs.push(...(await puppeteerLoader(page)))
            }
            if (process.env.DEBUG === 'true') console.info(`Finish ${relativeLinksMethod}`)
        } else {
            docs = await puppeteerLoader(url)
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

        return docs
    }
}

module.exports = { nodeClass: Puppeteer_DocumentLoaders }
