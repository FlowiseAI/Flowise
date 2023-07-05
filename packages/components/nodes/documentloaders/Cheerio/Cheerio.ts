import { INode, INodeData, INodeParams } from '../../../src/Interface'
import { TextSplitter } from 'langchain/text_splitter'
import { CheerioWebBaseLoader } from 'langchain/document_loaders/web/cheerio'
import { test } from 'linkifyjs'
import { webCrawl } from '../../../src'

class Cheerio_DocumentLoaders implements INode {
    label: string
    name: string
    description: string
    type: string
    icon: string
    category: string
    baseClasses: string[]
    inputs: INodeParams[]

    constructor() {
        this.label = 'Cheerio Web Scraper'
        this.name = 'cheerioWebScraper'
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
                label: 'Web Crawl for Relative Links',
                name: 'boolWebCrawl',
                type: 'boolean',
                optional: true,
                additionalParams: true
            },
            {
                label: 'Web Crawl Links Limit',
                name: 'limit',
                type: 'number',
                default: 10,
                optional: true,
                additionalParams: true,
                description: 'Set 0 to crawl all relative links'
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
        const boolWebCrawl = nodeData.inputs?.boolWebCrawl as boolean
        let limit = nodeData.inputs?.limit as string

        let url = nodeData.inputs?.url as string
        url = url.trim()
        if (!test(url)) {
            throw new Error('Invalid URL')
        }

        async function cheerioLoader(url: string): Promise<any> {
            try {
                let docs = []
                const loader = new CheerioWebBaseLoader(url)
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
        if (boolWebCrawl) {
            if (process.env.DEBUG === 'true') console.info('Start Web Crawl')
            if (!limit) throw new Error('Please set a limit to crawl')
            else if (parseInt(limit) < 0) throw new Error('Limit cannot be less than 0')
            const pages: string[] = await webCrawl(url, parseInt(limit))
            if (process.env.DEBUG === 'true') console.info(`pages: ${JSON.stringify(pages)}, length: ${pages.length}`)
            for (const page of pages) {
                docs.push(...(await cheerioLoader(page)))
            }
            if (process.env.DEBUG === 'true') console.info('Finish Web Crawl')
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

        return docs
    }
}

module.exports = { nodeClass: Cheerio_DocumentLoaders }
