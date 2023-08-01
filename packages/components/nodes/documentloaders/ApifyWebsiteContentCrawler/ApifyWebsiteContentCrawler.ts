import { INode, INodeData, INodeParams, ICommonObject } from '../../../src/Interface'
import { getCredentialData, getCredentialParam } from '../../../src/utils'
import { TextSplitter } from 'langchain/text_splitter'
import { ApifyDatasetLoader } from 'langchain/document_loaders/web/apify_dataset'
import { Document } from 'langchain/document'

class ApifyWebsiteContentCrawler_DocumentLoaders implements INode {
    label: string
    name: string
    description: string
    type: string
    icon: string
    version: number
    category: string
    baseClasses: string[]
    inputs: INodeParams[]
    credential: INodeParams

    constructor() {
        this.label = 'Apify Website Content Crawler'
        this.name = 'apifyWebsiteContentCrawler'
        this.type = 'Document'
        this.icon = 'apify-symbol-transparent.svg'
        this.version = 1.0
        this.category = 'Document Loaders'
        this.description = 'Load data from Apify Website Content Crawler'
        this.baseClasses = [this.type]
        this.inputs = [
            {
                label: 'Input',
                name: 'input',
                type: 'json',
                default: JSON.stringify({
                    startUrls: [{ url: 'https://js.langchain.com/docs/' }],
                    maxCrawlPages: 1
                })
            },
            {
                label: 'Text Splitter',
                name: 'textSplitter',
                type: 'TextSplitter',
                optional: true
            }
        ]
        this.credential = {
            label: 'Connect Apify API',
            name: 'credential',
            type: 'credential',
            credentialNames: ['apifyApi']
        }
    }

    async init(nodeData: INodeData, _: string, options: ICommonObject): Promise<any> {
        const textSplitter = nodeData.inputs?.textSplitter as TextSplitter
        const input = typeof nodeData.inputs?.input === 'object' ? nodeData.inputs?.input : JSON.parse(nodeData.inputs?.input as string)

        // Get Apify API token from credential data
        const credentialData = await getCredentialData(nodeData.credential ?? '', options)
        const apifyApiToken = getCredentialParam('apifyApiToken', credentialData, nodeData)

        const loader = await ApifyDatasetLoader.fromActorCall('apify/website-content-crawler', input, {
            datasetMappingFunction: (item) =>
                new Document({
                    pageContent: (item.text || '') as string,
                    metadata: { source: item.url }
                }),
            clientOptions: {
                token: apifyApiToken
            }
        })

        return textSplitter ? loader.loadAndSplit(textSplitter) : loader.load()
    }
}

module.exports = { nodeClass: ApifyWebsiteContentCrawler_DocumentLoaders }
