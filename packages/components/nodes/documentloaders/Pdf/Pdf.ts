import { INode, INodeData, INodeParams } from '../../../src/Interface'
import { TextSplitter } from 'langchain/text_splitter'
import { PDFLoader } from 'langchain/document_loaders/fs/pdf'

class Pdf_DocumentLoaders implements INode {
    label: string
    name: string
    description: string
    type: string
    icon: string
    category: string
    baseClasses: string[]
    inputs: INodeParams[]

    constructor() {
        this.label = 'Pdf File'
        this.name = 'pdfFile'
        this.type = 'Document'
        this.icon = 'pdf.svg'
        this.category = 'Document Loaders'
        this.description = `Load data from PDF files`
        this.baseClasses = [this.type]
        this.inputs = [
            {
                label: 'Pdf File',
                name: 'pdfFile',
                type: 'file',
                fileType: '.pdf'
            },
            {
                label: 'Text Splitter',
                name: 'textSplitter',
                type: 'TextSplitter',
                optional: true
            },
            {
                label: 'Usage',
                name: 'usage',
                type: 'options',
                options: [
                    {
                        label: 'One document per page',
                        name: 'perPage'
                    },
                    {
                        label: 'One document per file',
                        name: 'perFile'
                    }
                ],
                default: 'perPage'
            }
        ]
    }

    async init(nodeData: INodeData): Promise<any> {
        const textSplitter = nodeData.inputs?.textSplitter as TextSplitter
        const pdfFileBase64 = nodeData.inputs?.pdfFile as string
        const usage = nodeData.inputs?.usage as string

        const splitDataURI = pdfFileBase64.split(',')
        splitDataURI.pop()
        const bf = Buffer.from(splitDataURI.pop() || '', 'base64')
        const blob = new Blob([bf])

        if (usage === 'perFile') {
            // @ts-ignore
            const loader = new PDFLoader(blob, { splitPages: false, pdfjs: () => import('pdf-parse/lib/pdf.js/v1.10.100/build/pdf.js') })
            if (textSplitter) {
                const docs = await loader.loadAndSplit(textSplitter)
                return docs
            } else {
                const docs = await loader.load()
                return docs
            }
        } else {
            // @ts-ignore
            const loader = new PDFLoader(blob, { pdfjs: () => import('pdf-parse/lib/pdf.js/v1.10.100/build/pdf.js') })
            if (textSplitter) {
                const docs = await loader.loadAndSplit(textSplitter)
                return docs
            } else {
                const docs = await loader.load()
                return docs
            }
        }
    }
}

module.exports = { nodeClass: Pdf_DocumentLoaders }
