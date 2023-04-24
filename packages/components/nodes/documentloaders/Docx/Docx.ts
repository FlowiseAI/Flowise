import { INode, INodeData, INodeParams } from '../../../src/Interface'
import { TextSplitter } from 'langchain/text_splitter'
import { DocxLoader } from 'langchain/document_loaders/fs/docx'

class Docx_DocumentLoaders implements INode {
    label: string
    name: string
    description: string
    type: string
    icon: string
    category: string
    baseClasses: string[]
    inputs: INodeParams[]

    constructor() {
        this.label = 'Docx File'
        this.name = 'docxFile'
        this.type = 'Document'
        this.icon = 'Docx.png'
        this.category = 'Document Loaders'
        this.description = `Load data from DOCX files`
        this.baseClasses = [this.type]
        this.inputs = [
            {
                label: 'Docx File',
                name: 'docxFile',
                type: 'file',
                fileType: '.docx'
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
        const docxFileBase64 = nodeData.inputs?.docxFile as string
        const splitDataURI = docxFileBase64.split(',')
        splitDataURI.pop()
        const bf = Buffer.from(splitDataURI.pop() || '', 'base64')

        const blob = new Blob([bf])
        const loader = new DocxLoader(blob)

        if (textSplitter) {
            const docs = await loader.loadAndSplit(textSplitter)
            return docs
        } else {
            const docs = await loader.load()
            return docs
        }
    }
}

module.exports = { nodeClass: Docx_DocumentLoaders }
