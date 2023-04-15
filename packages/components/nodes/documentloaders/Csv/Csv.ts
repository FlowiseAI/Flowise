import { INode, INodeData, INodeParams } from '../../../src/Interface'
import { TextSplitter } from 'langchain/text_splitter'
import { CSVLoader } from "langchain/document_loaders/fs/csv";

class Csv_DocumentLoaders implements INode {
    label: string
    name: string
    description: string
    type: string
    icon: string
    category: string
    baseClasses: string[]
    inputs: INodeParams[]

    constructor() {
        this.label = 'Csv File'
        this.name = 'csvFile'
        this.type = 'Document'
        this.icon = 'Csv.png'
        this.category = 'Document Loaders'
        this.description = `Load data from CSV files`
        this.baseClasses = [this.type]
        this.inputs = [
            {
                label: 'Csv File',
                name: 'csvFile',
                type: 'file',
                fileType: '.csv'
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
        const csvFileBase64 = nodeData.inputs?.csvFile as string
        const splitDataURI = csvFileBase64.split(',')
        splitDataURI.pop()
        const bf = Buffer.from(splitDataURI.pop() || '', 'base64')

        const blob = new Blob([bf])
        const loader = new CSVLoader(blob)

        if (textSplitter) {
            const docs = await loader.loadAndSplit(textSplitter)
            return docs
        } else {
            const docs = await loader.load()
            return docs
        }
    }
}

module.exports = { nodeClass: Csv_DocumentLoaders }
