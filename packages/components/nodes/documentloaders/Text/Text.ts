import { INode, INodeData, INodeParams } from '../../../src/Interface'

class Text_DocumentLoaders implements INode {
    label: string
    name: string
    description: string
    type: string
    icon: string
    category: string
    baseClasses: string[]
    inputs: INodeParams[]

    constructor() {
        this.label = 'Text File'
        this.name = 'textFile'
        this.type = 'Text'
        this.icon = 'textFile.svg'
        this.category = 'Document Loaders'
        this.description = `Load data from text files`
        this.inputs = [
            {
                label: 'Txt File',
                name: 'txtFile',
                type: 'file',
                fileType: '.txt'
            },
            {
                label: 'Text Splitter',
                name: 'textSplitter',
                type: 'TextSplitter',
                optional: true
            }
        ]
    }

    async getBaseClasses(): Promise<string[]> {
        return ['Document']
    }

    async init(nodeData: INodeData): Promise<any> {
        const { TextLoader } = await import('langchain/document_loaders')
        const textSplitter = nodeData.inputs?.textSplitter
        const txtFileBase64 = nodeData.inputs?.txtFile as string
        const splitDataURI = txtFileBase64.split(',')
        splitDataURI.pop()
        const bf = Buffer.from(splitDataURI.pop() || '', 'base64')

        const blob = new Blob([bf])
        const loader = new TextLoader(blob)

        if (textSplitter) {
            const docs = await loader.loadAndSplit(textSplitter)
            return docs
        } else {
            const docs = await loader.load()
            return docs
        }
    }
}

module.exports = { nodeClass: Text_DocumentLoaders }
