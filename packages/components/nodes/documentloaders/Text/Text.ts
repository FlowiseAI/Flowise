import { INode, INodeData, INodeParams } from '../../../src/Interface'
import { TextSplitter } from 'langchain/text_splitter'
import { TextLoader } from 'langchain/document_loaders/fs/text'

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
        this.type = 'Document'
        this.icon = 'textFile.svg'
        this.category = 'Document Loaders'
        this.description = `Load data from text files`
        this.baseClasses = [this.type]
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

    async init(nodeData: INodeData): Promise<any> {
        const textSplitter = nodeData.inputs?.textSplitter as TextSplitter
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
