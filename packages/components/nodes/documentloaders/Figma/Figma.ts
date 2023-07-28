import { getCredentialData, getCredentialParam } from '../../../src'
import { ICommonObject, INode, INodeData, INodeParams } from '../../../src/Interface'
import { FigmaFileLoader, FigmaLoaderParams } from 'langchain/document_loaders/web/figma'

class Figma_DocumentLoaders implements INode {
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
        this.label = 'Figma'
        this.name = 'figma'
        this.version = 1.0
        this.type = 'Document'
        this.icon = 'figma.svg'
        this.category = 'Document Loaders'
        this.description = 'Load data from a Figma file'
        this.baseClasses = [this.type]
        this.credential = {
            label: 'Connect Credential',
            name: 'credential',
            type: 'credential',
            credentialNames: ['figmaApi']
        }
        this.inputs = [
            {
                label: 'File Key',
                name: 'fileKey',
                type: 'string',
                placeholder: 'key',
                description:
                    'The file key can be read from any Figma file URL: https://www.figma.com/file/:key/:title. For example, in https://www.figma.com/file/12345/Website, the file key is 12345'
            },
            {
                label: 'Node IDs',
                name: 'nodeIds',
                type: 'string',
                placeholder: '0, 1, 2',
                description:
                    'A list of Node IDs, seperated by comma. Refer to <a target="_blank" href="https://www.figma.com/community/plugin/758276196886757462/Node-Inspector">official guide</a> on how to get Node IDs'
            },
            {
                label: 'Recursive',
                name: 'recursive',
                type: 'boolean',
                optional: true
            },
            {
                label: 'Text Splitter',
                name: 'textSplitter',
                type: 'TextSplitter',
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
        const nodeIds = (nodeData.inputs?.nodeIds as string)?.trim().split(',') || []
        const fileKey = nodeData.inputs?.fileKey as string

        const credentialData = await getCredentialData(nodeData.credential ?? '', options)
        const accessToken = getCredentialParam('accessToken', credentialData, nodeData)

        const figmaOptions: FigmaLoaderParams = {
            accessToken,
            nodeIds,
            fileKey
        }

        const loader = new FigmaFileLoader(figmaOptions)
        const docs = await loader.load()

        return docs
    }
}

module.exports = { nodeClass: Figma_DocumentLoaders }
