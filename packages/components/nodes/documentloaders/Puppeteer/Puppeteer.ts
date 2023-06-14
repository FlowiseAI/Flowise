import { INode, INodeData, INodeParams } from '../../../src/Interface'
import { TextSplitter } from 'langchain/text_splitter'
import { PuppeteerWebBaseLoader } from 'langchain/document_loaders/web/puppeteer'
import { test } from 'linkifyjs'
import { getAvailableURLs } from '../../../src'

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
                label: 'Web Scrape for Relative Links',
                name: 'webScrape',
                type: 'boolean',
                optional: true,
                additionalParams: true
            },
            {
                label: 'Web Scrape Links Limit',
                name: 'limit',
                type: 'number',
                default: 10,
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
        const webScrape = nodeData.inputs?.webScrape as boolean
        let limit = nodeData.inputs?.limit as string

        let url = nodeData.inputs?.url as string
        url = url.trim()
        if (!test(url)) {
            throw new Error('Invalid URL')
        }

        const puppeteerLoader = async (url: string): Promise<any> => {
            let docs = []
            const loader = new PuppeteerWebBaseLoader(url)
            if (textSplitter) {
                docs = await loader.loadAndSplit(textSplitter)
            } else {
                docs = await loader.load()
            }
            return docs
        }

        let availableUrls: string[]
        let docs = []
        if (webScrape) {
            if (!limit) limit = '10'
            availableUrls = await getAvailableURLs(url, parseInt(limit))
            for (let i = 0; i < availableUrls.length; i++) {
                try {
                    docs.push(...(await puppeteerLoader(availableUrls[i])))
                } catch (error) {
                    console.error('Error loading url with puppeteer. URL: ', availableUrls[i], 'Error: ', error)
                    continue
                }
            }
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
