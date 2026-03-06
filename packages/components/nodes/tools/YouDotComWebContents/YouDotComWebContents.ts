import { DynamicStructuredTool } from '@langchain/core/tools'
import { ICommonObject, INode, INodeData, INodeParams } from '../../../src/Interface'
import { getBaseClasses, getCredentialData, getCredentialParam } from '../../../src/utils'
import { youContents } from '@youdotcom-oss/langchain'

class YouDotComWebContents_Tools implements INode {
    label: string
    name: string
    version: number
    description: string
    type: string
    icon: string
    category: string
    author: string
    baseClasses: string[]
    credential: INodeParams
    inputs: INodeParams[]

    constructor() {
        this.label = 'You.com Web Contents'
        this.name = 'youDotComWebContents'
        this.version = 1.0
        this.type = 'YouDotComWebContents'
        this.icon = 'Youcom_logo.jpg'
        this.category = 'Tools'
        this.author = 'You.com'
        this.description = 'Extract full page content from URLs in markdown, HTML, or metadata format using You.com'
        this.credential = {
            label: 'Connect Credential',
            name: 'credential',
            type: 'credential',
            credentialNames: ['youDotComApi']
        }
        this.inputs = [
            {
                label: 'Formats',
                name: 'formats',
                type: 'multiOptions',
                options: [
                    { label: 'Markdown', name: 'markdown' },
                    { label: 'HTML', name: 'html' },
                    { label: 'Metadata', name: 'metadata' }
                ],
                default: ['markdown'],
                optional: true,
                additionalParams: true,
                description: 'Output format(s) for extracted page content'
            },
            {
                label: 'Crawl Timeout',
                name: 'crawl_timeout',
                type: 'number',
                optional: true,
                additionalParams: true,
                description: 'Timeout in seconds for page crawling (1–60)'
            }
        ]
        this.baseClasses = [this.type, 'Tool', ...getBaseClasses(DynamicStructuredTool)]
    }

    async init(nodeData: INodeData, _: string, options: ICommonObject): Promise<any> {
        const credentialData = await getCredentialData(nodeData.credential ?? '', options)
        const apiKey = getCredentialParam('ydcApiKey', credentialData, nodeData)

        const config: Record<string, any> = { apiKey }

        const formats = nodeData.inputs?.formats as string[]
        const crawl_timeout = nodeData.inputs?.crawl_timeout as number

        if (formats && formats.length > 0) config.formats = formats
        if (crawl_timeout) config.crawl_timeout = crawl_timeout

        return youContents(config)
    }
}

module.exports = { nodeClass: YouDotComWebContents_Tools }
