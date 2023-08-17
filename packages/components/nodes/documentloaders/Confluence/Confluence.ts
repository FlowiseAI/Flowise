import { ICommonObject, INode, INodeData, INodeParams } from '../../../src/Interface'
import { TextSplitter } from 'langchain/text_splitter'
import { ConfluencePagesLoader, ConfluencePagesLoaderParams } from 'langchain/document_loaders/web/confluence'
import { getCredentialData, getCredentialParam } from '../../../src'

class Confluence_DocumentLoaders implements INode {
    label: string
    name: string
    version: number
    description: string
    type: string
    icon: string
    category: string
    baseClasses: string[]
    credential: INodeParams
    inputs: INodeParams[]

    constructor() {
        this.label = 'Confluence'
        this.name = 'confluence'
        this.version = 1.0
        this.type = 'Document'
        this.icon = 'confluence.png'
        this.category = 'Document Loaders'
        this.description = `Load data from a Confluence Document`
        this.baseClasses = [this.type]
        this.credential = {
            label: 'Connect Credential',
            name: 'credential',
            type: 'credential',
            credentialNames: ['confluenceApi']
        }
        this.inputs = [
            {
                label: 'Text Splitter',
                name: 'textSplitter',
                type: 'TextSplitter',
                optional: true
            },
            {
                label: 'Base URL',
                name: 'baseUrl',
                type: 'string',
                placeholder: 'https://example.atlassian.net/wiki'
            },
            {
                label: 'Space Key',
                name: 'spaceKey',
                type: 'string',
                placeholder: '~EXAMPLE362906de5d343d49dcdbae5dEXAMPLE',
                description:
                    'Refer to <a target="_blank" href="https://community.atlassian.com/t5/Confluence-questions/How-to-find-the-key-for-a-space/qaq-p/864760">official guide</a> on how to get Confluence Space Key'
            },
            {
                label: 'Limit',
                name: 'limit',
                type: 'number',
                default: 0,
                optional: true
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

    async init(nodeData: INodeData, _: string, options: ICommonObject): Promise<any> {
        const spaceKey = nodeData.inputs?.spaceKey as string
        const baseUrl = nodeData.inputs?.baseUrl as string
        const limit = nodeData.inputs?.limit as number
        const textSplitter = nodeData.inputs?.textSplitter as TextSplitter
        const metadata = nodeData.inputs?.metadata

        const credentialData = await getCredentialData(nodeData.credential ?? '', options)
        const accessToken = getCredentialParam('accessToken', credentialData, nodeData)
        const username = getCredentialParam('username', credentialData, nodeData)

        const confluenceOptions: ConfluencePagesLoaderParams = {
            username,
            accessToken,
            baseUrl,
            spaceKey,
            limit
        }

        const loader = new ConfluencePagesLoader(confluenceOptions)

        let docs = []

        if (textSplitter) {
            docs = await loader.loadAndSplit(textSplitter)
        } else {
            docs = await loader.load()
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

module.exports = { nodeClass: Confluence_DocumentLoaders }
