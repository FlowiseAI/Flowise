import { INode, INodeData, INodeParams } from '../../../src/Interface'
import { FigmaFileLoader, FigmaLoaderParams } from 'langchain/document_loaders/web/figma'

class Figma_DocumentLoaders implements INode {
    label: string
    name: string
    description: string
    type: string
    icon: string
    category: string
    baseClasses: string[]
    inputs: INodeParams[]

    constructor() {
        this.label = 'Figma'
        this.name = 'figma'
        this.type = 'Document'
        this.icon = 'figma.png'
        this.category = 'Document Loaders'
        this.description = 'Load data from a Figma file'
        this.baseClasses = [this.type]
        this.inputs = [
            {
                label: 'Access Token',
                name: 'accessToken',
                type: 'password',
                placeholder: '<FIGMA_ACCESS_TOKEN>'
            },
            {
                label: 'File Key',
                name: 'fileKey',
                type: 'string',
                placeholder: 'key'
            },
            {
                label: 'Node IDs',
                name: 'nodeIds',
                type: 'string',
                placeholder: '0, 1, 2'
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

    async init(nodeData: INodeData): Promise<any> {
        const accessToken = nodeData.inputs?.accessToken as string
        const nodeIds = (nodeData.inputs?.nodeIds as string)?.split(',') || []
        const fileKey = nodeData.inputs?.fileKey as string

        const options: FigmaLoaderParams = {
            accessToken,
            nodeIds,
            fileKey
        }

        const loader = new FigmaFileLoader(options)
        const docs = await loader.load()

        return docs
    }
}

module.exports = { nodeClass: Figma_DocumentLoaders }
