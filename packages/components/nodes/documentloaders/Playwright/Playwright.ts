import { omit } from 'lodash'
import { ICommonObject, IDocument, INode, INodeData, INodeParams } from '../../../src/Interface'
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
                default: 'webCrawl',
                optional: true,
                additionalParams: true
            },
            {
                label: 'Get Relative Links Limit',
                name: 'limit',
                type: 'number',
                optional: true,
                default: '10',
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
                label: 'Additional Metadata',
                name: 'metadata',
                type: 'json',
                description: 'Additional metadata to be added to the extracted documents',
                optional: true,
                additionalParams: true
            },
            {
                label: 'Omit Metadata Keys',
                name: 'omitMetadataKeys',
                type: 'string',
                rows: 4,
                description:
                    'Each document loader comes with a default set of metadata keys that are extracted from the document. You can use this field to omit some of the default metadata keys. The value should be a list of keys, seperated by comma',
                placeholder: 'key1, key2, key3.nestedKey1',
                optional: true,
                additionalParams: true
            }
        ]
    }

    async init(nodeData: INodeData, _: string, options: ICommonObject): Promise<any> {
        const textSplitter = nodeData.inputs?.textSplitter as TextSplitter
        const metadata = nodeData.inputs?.metadata
        const relativeLinksMethod = nodeData.inputs?.relativeLinksMethod as string
        const selectedLinks = nodeData.inputs?.selectedLinks as string[]
        let limit = parseInt(nodeData.inputs?.limit as string)
        let waitUntilGoToOption = nodeData.inputs?.waitUntilGoToOption as 'load' | 'domcontentloaded' | 'networkidle' | 'commit' | undefined
        let waitForSelector = nodeData.inputs?.waitForSelector as string
        const _omitMetadataKeys = nodeData.inputs?.omitMetadataKeys as string

        let omitMetadataKeys: string[] = []
        if (_omitMetadataKeys) {
            omitMetadataKeys = _omitMetadataKeys.split(',').map((key) => key.trim())
        }

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
                if (process.env.DEBUG === 'true') options.logger.error(`error in PlaywrightWebBaseLoader: ${err.message}, on page: ${url}`)
            }
        }

        let docs: IDocument[] = []
        if (relativeLinksMethod) {
            if (process.env.DEBUG === 'true') options.logger.info(`Start ${relativeLinksMethod}`)
            // if limit is 0 we don't want it to default to 10 so we check explicitly for null or undefined
            // so when limit is 0 we can fetch all the links
            if (limit === null || limit === undefined) limit = 10
            else if (limit < 0) throw new Error('Limit cannot be less than 0')
            const pages: string[] =
                selectedLinks && selectedLinks.length > 0
                    ? selectedLinks.slice(0, limit === 0 ? undefined : limit)
                    : relativeLinksMethod === 'webCrawl'
                    ? await webCrawl(url, limit)
                    : await xmlScrape(url, limit)
            if (process.env.DEBUG === 'true') options.logger.info(`pages: ${JSON.stringify(pages)}, length: ${pages.length}`)
            if (!pages || pages.length === 0) throw new Error('No relative links found')
            for (const page of pages) {
                docs.push(...(await playwrightLoader(page)))
            }
            if (process.env.DEBUG === 'true') options.logger.info(`Finish ${relativeLinksMethod}`)
        } else if (selectedLinks && selectedLinks.length > 0) {
            if (process.env.DEBUG === 'true')
                options.logger.info(`pages: ${JSON.stringify(selectedLinks)}, length: ${selectedLinks.length}`)
            for (const page of selectedLinks.slice(0, limit)) {
                docs.push(...(await playwrightLoader(page)))
            }
        } else {
            docs = await playwrightLoader(url)
        }

        if (metadata) {
            const parsedMetadata = typeof metadata === 'object' ? metadata : JSON.parse(metadata)
            docs = docs.map((doc) => ({
                ...doc,
                metadata: omit(
                    {
                        ...doc.metadata,
                        ...parsedMetadata
                    },
                    omitMetadataKeys
                )
            }))
        } else {
            docs = docs.map((doc) => ({
                ...doc,
                metadata: omit(
                    {
                        ...doc.metadata
                    },
                    omitMetadataKeys
                )
            }))
        }

        return docs
    }
}

module.exports = { nodeClass: Playwright_DocumentLoaders }
