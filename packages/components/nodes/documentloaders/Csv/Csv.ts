import { INode, INodeData, INodeParams } from '../../../src/Interface'
import { TextSplitter } from 'langchain/text_splitter'
import { CSVLoader } from 'langchain/document_loaders/fs/csv'

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
            },
            {
                label: 'Single Column Extraction',
                name: 'columnName',
                type: 'string',
                description: 'Extracting a single column',
                placeholder: 'Enter column name',
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
        const textSplitter = nodeData.inputs?.textSplitter as TextSplitter
        const csvFileBase64 = nodeData.inputs?.csvFile as string
        const columnName = nodeData.inputs?.columnName as string
        const metadata = nodeData.inputs?.metadata

        const files: string[] = (csvFileBase64.startsWith('[') && csvFileBase64.endsWith(']')) ? JSON.parse(csvFileBase64) : [csvFileBase64]

        const alldocs = await Promise.all(files.map(async (file) => {
            const splitDataURI = file.split(',')
            splitDataURI.pop()
            const bf = Buffer.from(splitDataURI.pop() || '', 'base64')
            const blob = new Blob([bf])
            const loader = new CSVLoader(blob, columnName.trim().length === 0 ? undefined : columnName.trim())

            return textSplitter ? await loader.loadAndSplit(textSplitter) : await loader.load()
        }))

        if (metadata) {
            const parsedMetadata = typeof metadata === 'object' ? metadata : JSON.parse(metadata)
            return alldocs.map((doc) => {
                return {
                    ...doc,
                    metadata: {
                        // @ts-ignore-next-line
                        ...doc.metadata,
                        ...parsedMetadata
                    }
                }
            })
        }

        return alldocs
    }
}

module.exports = { nodeClass: Csv_DocumentLoaders }
