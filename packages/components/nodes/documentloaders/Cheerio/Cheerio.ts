import { INode, INodeData, INodeParams } from '../../../src/Interface'
import { TextSplitter } from 'langchain/text_splitter'
import { CheerioWebBaseLoader } from 'langchain/document_loaders/web/cheerio'
import { test } from 'linkifyjs'
import { getAvailableURLs } from '../../../src'

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
                label: 'Web Scrap for Relative Links',
                name: 'webScrap',
                type: 'boolean',
                optional: true,
                additionalParams: true
            },
            {
                label: 'Web Scrap Links Limit',
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
        const webScrap = nodeData.inputs?.webScrap as boolean
        let limit = nodeData.inputs?.limit as string

        let url = nodeData.inputs?.url as string
        url = url.trim()
        if (!test(url)) {
            throw new Error('Invalid URL')
        }

        const cheerioLoader = async (url: string): Promise<any> => {
            let docs = []
            const loader = new CheerioWebBaseLoader(url)
            if (textSplitter) {
                docs = await loader.loadAndSplit(textSplitter)
            } else {
                docs = await loader.load()
            }
            return docs
        }

        let availableUrls: string[]
        let docs = []
        if (webScrap) {
            if (!limit) limit = '10'
            availableUrls = await getAvailableURLs(url, parseInt(limit))
            for (let i = 0; i < availableUrls.length; i++) {
                docs.push(...(await cheerioLoader(availableUrls[i])))
            }
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
