import { INode, INodeData, INodeParams } from '../../../src/Interface'
import { TextSplitter } from 'langchain/text_splitter'
import { Browser, Page, PlaywrightWebBaseLoader, PlaywrightWebBaseLoaderOptions } from 'langchain/document_loaders/web/playwright'
import { test } from 'linkifyjs'
import { webCrawl, xmlScrape } from '../../../src'

class Playwright_DocumentLoaders implements INode {
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
        this.label = 'Playwright Web Scraper'
        this.name = 'playwrightWebScraper'
        this.version = 1.0
        this.type = 'Document'
        this.icon = 'playwright.svg'
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
                label: 'Wait Until',
                name: 'waitUntilGoToOption',
                type: 'options',
                description: 'Select a go to wait until option',
                options: [
                    {
                        label: 'Load',
                        name: 'load',
                        description: 'Consider operation to be finished when the load event is fired.'
                    },
                    {
                        label: 'DOM Content Loaded',
                        name: 'domcontentloaded',
                        description: 'Consider operation to be finished when the DOMContentLoaded event is fired.'
                    },
                    {
                        label: 'Network Idle',
                        name: 'networkidle',
                        description: 'Navigation is finished when there are no more connections for at least 500 ms.'
                    },
                    {
                        label: 'Commit',
                        name: 'commit',
                        description: 'Consider operation to be finished when network response is received and the document started loading.'
                    }
                ],
                optional: true,
                additionalParams: true
            },
            {
                label: 'Wait for selector to load',
                name: 'waitForSelector',
                type: 'string',
                optional: true,
                additionalParams: true,
                description: 'CSS selectors like .div or #div'
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
        let waitUntilGoToOption = nodeData.inputs?.waitUntilGoToOption as 'load' | 'domcontentloaded' | 'networkidle' | 'commit' | undefined
        let waitForSelector = nodeData.inputs?.waitForSelector as string

        let url = nodeData.inputs?.url as string
        url = url.trim()
        if (!test(url)) {
            throw new Error('Invalid URL')
        }

        async function playwrightLoader(url: string): Promise<any> {
            try {
                let docs = []
                const config: PlaywrightWebBaseLoaderOptions = {
                    launchOptions: {
                        args: ['--no-sandbox'],
                        headless: true
                    }
                }
                if (waitUntilGoToOption) {
                    config['gotoOptions'] = {
                        waitUntil: waitUntilGoToOption
                    }
                }
                if (waitForSelector) {
                    config['evaluate'] = async (page: Page, _: Browser): Promise<string> => {
                        await page.waitForSelector(waitForSelector)

                        const result = await page.evaluate(() => document.body.innerHTML)
                        return result
                    }
                }
                const loader = new PlaywrightWebBaseLoader(url, config)
                if (textSplitter) {
                    docs = await loader.loadAndSplit(textSplitter)
                } else {
                    docs = await loader.load()
                }
                return docs
            } catch (err) {
                if (process.env.DEBUG === 'true') console.error(`error in PlaywrightWebBaseLoader: ${err.message}, on page: ${url}`)
            }
        }

        let docs = []
        if (relativeLinksMethod) {
            if (process.env.DEBUG === 'true') console.info(`Start ${relativeLinksMethod}`)
            if (!limit) limit = '10'
            else if (parseInt(limit) < 0) throw new Error('Limit cannot be less than 0')
            const pages: string[] =
                relativeLinksMethod === 'webCrawl' ? await webCrawl(url, parseInt(limit)) : await xmlScrape(url, parseInt(limit))
            if (process.env.DEBUG === 'true') console.info(`pages: ${JSON.stringify(pages)}, length: ${pages.length}`)
            if (!pages || pages.length === 0) throw new Error('No relative links found')
            for (const page of pages) {
                docs.push(...(await playwrightLoader(page)))
            }
            if (process.env.DEBUG === 'true') console.info(`Finish ${relativeLinksMethod}`)
        } else {
            docs = await playwrightLoader(url)
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

module.exports = { nodeClass: Playwright_DocumentLoaders }
