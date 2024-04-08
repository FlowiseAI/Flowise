import { ICommonObject, INode, INodeData, INodeParams } from '../../../src/Interface'
import { TextSplitter } from 'langchain/text_splitter'
import { CSVLoader } from 'langchain/document_loaders/fs/csv'
import path from 'path'
import { getStoragePath } from '../../../src'
import fs from 'fs'

class Csv_DocumentLoaders implements INode {
    label: string
    name: string
    version: number
    description: string
    type: string
    icon: string
    category: string
    baseClasses: string[]
    inputs: INodeParams[]

    constructor() {
        this.label = 'Csv File'
        this.name = 'csvFile'
        this.version = 1.0
        this.type = 'Document'
        this.icon = 'csv.svg'
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

    async init(nodeData: INodeData, _: string, options: ICommonObject): Promise<any> {
        const textSplitter = nodeData.inputs?.textSplitter as TextSplitter
        const csvFileBase64 = nodeData.inputs?.csvFile as string
        const columnName = nodeData.inputs?.columnName as string
        const metadata = nodeData.inputs?.metadata

        let alldocs = []
        let files: string[] = []

        if (csvFileBase64.startsWith('FILE-STORAGE::')) {
            const fileName = csvFileBase64.replace('FILE-STORAGE::', '')
            if (fileName.startsWith('[') && fileName.endsWith(']')) {
                files = JSON.parse(fileName)
            } else {
                files = [fileName]
            }
            const chatflowid = options.chatflowid

            for (const file of files) {
                const fileInStorage = path.join(getStoragePath(), chatflowid, file)
                const fileData = fs.readFileSync(fileInStorage)
                const blob = new Blob([fileData])
                const loader = new CSVLoader(blob, columnName.trim().length === 0 ? undefined : columnName.trim())

                if (textSplitter) {
                    const docs = await loader.loadAndSplit(textSplitter)
                    alldocs.push(...docs)
                } else {
                    const docs = await loader.load()
                    alldocs.push(...docs)
                }
            }
        } else {
            if (csvFileBase64.startsWith('[') && csvFileBase64.endsWith(']')) {
                files = JSON.parse(csvFileBase64)
            } else {
                files = [csvFileBase64]
            }

            for (const file of files) {
                const splitDataURI = file.split(',')
                splitDataURI.pop()
                const bf = Buffer.from(splitDataURI.pop() || '', 'base64')
                const blob = new Blob([bf])
                const loader = new CSVLoader(blob, columnName.trim().length === 0 ? undefined : columnName.trim())

                if (textSplitter) {
                    const docs = await loader.loadAndSplit(textSplitter)
                    alldocs.push(...docs)
                } else {
                    const docs = await loader.load()
                    alldocs.push(...docs)
                }
            }
        }

        if (metadata) {
            const parsedMetadata = typeof metadata === 'object' ? metadata : JSON.parse(metadata)
            let finaldocs = []
            for (const doc of alldocs) {
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

        return alldocs
    }
}

module.exports = { nodeClass: Csv_DocumentLoaders }
